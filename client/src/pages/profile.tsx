import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSignOut } from '@/lib/auth';
import { useAppContext } from '@/context/app-context';
import { queryClient } from '@/lib/queryClient';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import {
  Settings,
  UserRound,
  LogOut,
  Music,
  Map,
  Tag,
  Bookmark,
  CalendarClock,
  ThumbsUp,
  Users,
  Music2,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { useUserStats } from '@/hooks/useUserStats';
import { useUserLikedSets } from '@/hooks/useUserLikedSets';
import { useUserSavedSets } from '@/hooks/useUserSavedSets';

interface ProfileProps {
  openAuthModal: () => void;
}

// UserStats and GlobalRanking types are provided by useUserStats hook return types; not redeclaring here.

interface SavedSet {
  id: number;
  artist_name: string;
  location_name?: string;
  event_name?: string;
  event_date?: string;
  //some API responses return an array for image_url (e.g. [] or [url])
  image_url?: string | string[];
  saved_at: string;
}

interface LikedItem {
  id: string | number;
  name: string;
  count?: number;
  image_url?: string;
}

interface Friend {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  status: 'pending' | 'accepted' | 'requested';
  is_requester: boolean;
}

export function Profile({ openAuthModal }: ProfileProps) {
  const { user } = useAppContext();
  const { toast } = useToast();
  const { mutate: signOut } = useSignOut();
  const [activeTab, setActiveTab] = useState('saved');
  const [friendEmail, setFriendEmail] = useState('');
  const [friendUsername, setFriendUsername] = useState('');
  const [addByEmail, setAddByEmail] = useState(true);
  const [, setLocation] = useLocation();

  // Use our new hooks
  const { data: stats } = useUserStats(user?.id || '');
  const { data: likedSets = [], isLoading: isLoadingLikedSets } = useUserLikedSets(user?.id || '');
  const { data: savedSets = [], isLoading: isLoadingSavedSets } = useUserSavedSets(user?.id || '');

  console.log("[DEBUG] Fetched saved sets:", savedSets?.data);

  // Component to fetch artist image from server-side API when not provided by the API
  function ArtistImage({ name, alt, className }: { name: string; alt?: string; className?: string }) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
      let mounted = true;
      if (!name) return;

      const fetchImage = async () => {
        try {
          const res = await fetchWithAuth(`/api/spotify/artist-image?name=${encodeURIComponent(name)}`);
          if (!mounted) return;
          if (!res.ok) return;
          const data = await res.json();
          if (data?.imageUrl && mounted) setImageUrl(data.imageUrl);
        } catch (err) {
          // ignore fetch errors, leave imageUrl null
          console.debug('[ArtistImage] fetch error for', name, err);
        }
      };

      fetchImage();
      return () => { mounted = false; };
    }, [name]);

    if (imageUrl) {
      return <img src={imageUrl} alt={alt || name} className={className || 'w-full h-full object-cover'} />;
    }

    // fallback icon
    return (
      <div className={`flex items-center justify-center h-full w-full ${className || ''}`}>
        <Music className="h-8 w-8 text-white/70" />
      </div>
    );
  }


  // Fetch liked artists
  const { data: likedArtists = [], isLoading: isLoadingLikedArtists } = useQuery<LikedItem[]>({
    queryKey: [`/api/users/${user?.id}/liked-artists`],
    enabled: !!user?.id,
  });

  // Fetch liked venues
  const { data: likedVenues = [], isLoading: isLoadingLikedVenues } = useQuery<LikedItem[]>({
    queryKey: [`/api/users/${user?.id}/liked-venues`],
    enabled: !!user?.id,
  });

  // Fetch liked genres
  const { data: likedGenres = [], isLoading: isLoadingLikedGenres } = useQuery<LikedItem[]>({
    queryKey: [`/api/users/gener`],
    enabled: !!user?.id,
  });

  // Fetch friends
  const { data: friends = [], isLoading: isLoadingFriends } = useQuery<Friend[]>({
    queryKey: [`/api/users/${user?.id}/friends`],
    enabled: !!user?.id,
  });

  // Add friend mutation
  const addFriendMutation = useMutation({
    mutationFn: async (friendData: { email?: string; username?: string }) => {
      const res = await fetchWithAuth(`/api/users/${user?.id}/friends`, {
        method: 'POST',
        body: JSON.stringify(friendData),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add friend');
      }
      return await res.json();
    },
    onSuccess: () => {
      setFriendEmail('');
      setFriendUsername('');
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/friends`] });
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add friend",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Accept friend request mutation
  const acceptFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const res = await fetchWithAuth(`/api/users/${user?.id}/friends/${friendId}/accept`, {
        method: 'PUT',
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to accept friend request');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/friends`] });
      toast({
        title: "Friend request accepted",
        description: "You are now friends!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept friend request",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Remove friend mutation
  const removeFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const res = await fetchWithAuth(`/api/users/${user?.id}/friends/${friendId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to remove friend');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/friends`] });
      toast({
        title: "Friend removed",
        description: "Friend has been removed from your list.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove friend",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle adding a friend
  const handleAddFriend = () => {
    if (addByEmail && !friendEmail) {
      toast({
        title: "Email required",
        description: "Please enter your friend's email address.",
        variant: "destructive",
      });
      return;
    }

    if (!addByEmail && !friendUsername) {
      toast({
        title: "Username required",
        description: "Please enter your friend's username.",
        variant: "destructive",
      });
      return;
    }

    addFriendMutation.mutate(
      addByEmail ? { email: friendEmail } : { username: friendUsername }
    );
  };

  const handleLogout = () => {
    signOut(undefined, {
      onSuccess: () => {
        toast({
          title: "Logged out",
          description: "You have been successfully logged out.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to log out. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <Card className="bg-spotify-light-black border-none rounded-lg max-w-md mx-auto w-full">
          <CardContent className="p-8 text-center">
            <UserRound className="h-12 w-12 mx-auto text-spotify-light-gray mb-4" />
            <h3 className="text-xl font-montserrat font-bold mb-2">Not Signed In</h3>
            <p className="text-spotify-light-gray mb-6">
              Sign in to access your profile and settings
            </p>
            <Button
              onClick={openAuthModal}
              className="bg-spotify-green text-black font-montserrat font-semibold hover:bg-spotify-green/80"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper function to render a set card
  const renderSetCard = (set: SavedSet) => {

    return (
      <Card key={set.id} className="bg-gray-800 border-none rounded-lg overflow-hidden mb-3">
        <div className="flex">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-400 flex-shrink-0">
            {(() => {
              const img = Array.isArray(set.image_url)
                ? set.image_url[0]
                : set.image_url;
              return img ? (
                <img src={img} alt={set.artist_name} className="w-full h-full object-cover" />
              ) : (
                // Use ArtistImage to fetch from server if available
                <ArtistImage name={set.artist_name} alt={set.artist_name} className="w-full h-full object-cover" />
              );
            })()}
          </div>
          <div className="p-3 flex-grow">
            <h4 className="font-semibold text-sm line-clamp-1">{set.artist_name}</h4>
            <p className="text-xs text-gray-400 line-clamp-1">{set.location_name}</p>
              <div className="flex items-center mt-1">
              <CalendarClock className="h-3 w-3 text-gray-500 mr-1" />
              <span className="text-xs text-gray-500">
                {set.event_date ? new Date(set.event_date).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      </Card>
    )
  };

  // Helper function to render an item card (artists, genres, venues)
  const renderItemCard = (item: LikedItem) => (
    <Card key={item.id} className="bg-gray-800 border-none rounded-lg overflow-hidden mb-3">
      <div className="flex">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-400 flex-shrink-0">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <ArtistImage name={item.name} alt={item.name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="p-3 flex-grow flex flex-col justify-center">
          <h4 className="font-semibold text-sm line-clamp-1">{item.name}</h4>
          {item.count && (
            <p className="text-xs text-gray-400">
              {item.count} {item.count === 1 ? 'set' : 'sets'}
            </p>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <>
      <div className="text-center mb-6">
        <div className="h-24 w-24 bg-gray-800 rounded-full overflow-hidden mx-auto mb-3">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-800 text-white text-2xl font-bold">
              {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold">{user.username || 'User'}</h2>
        <p className="text-sm text-gray-400">{user.email}</p>
      </div>

      {/* User Stats Card */}
      <Card className="bg-gray-800 border-none rounded-lg mb-6">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Music2 className="mr-2 h-5 w-5" />
            Your Stats
          </h3>

          {stats ? (
            <div className="w-full">
              <div className="grid grid-cols-3 gap-4 text-center text-white bg-[#1e2836] rounded-xl py-4 shadow-sm">
                <div>
                  <div className="text-2xl font-bold">{stats.totalSets ?? 0}</div>
                  <div className="text-xs text-gray-400">Sets Logged</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.likedSets ?? 0}</div>
                  <div className="text-xs text-gray-400">Sets Liked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.friends ?? 0}</div>
                  <div className="text-xs text-gray-400">Friends</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full animate-pulse">
              <div className="h-5 bg-gray-700 rounded w-1/3 mb-3"></div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="h-10 bg-gray-700 rounded" />
                <div className="h-10 bg-gray-700 rounded" />
                <div className="h-10 bg-gray-700 rounded" />
              </div>
            </div>
          )}

          {/* Detailed Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-4 text-sm text-white bg-gray-900 rounded-lg p-3 mb-2 mt-3">
              <div><strong>Sets Logged:</strong> {stats.totalSets ?? 0}</div>
              <div><strong>Liked (Logged):</strong> {stats.likedSets ?? 0}</div>
              <div><strong>Liked (Discover):</strong> {stats.discoveryLikedSets ?? 0}</div>
              <div><strong>Saved Sets:</strong> {stats.savedSets ?? 0}</div>
              <div><strong>Friends:</strong> {stats.friends ?? 0}</div>
            </div>
          )}

          {/* Global Ranking */}
          {stats?.globalRanking && (
            <div className="bg-gray-900 rounded-lg p-3 text-center mb-2">
              <p className="text-sm text-gray-400 mb-1">Global Ranking</p>
              <div className="flex items-center justify-center">
                <div className="text-xl font-bold text-amber-500">{stats.globalRanking.rank}</div>
                <span className="text-gray-400 mx-1">of</span>
                <div className="text-lg font-bold text-white">{stats.globalRanking.totalUsers}</div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Top {stats.globalRanking.percentile}% of all users
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Content Tabs */}
      <Tabs defaultValue={activeTab} className="mb-6">
        <TabsList className="grid grid-cols-7 mb-4">
          <TabsTrigger value="saved" onClick={() => setActiveTab('saved')}>
            <Bookmark className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Saved</span>
          </TabsTrigger>
          <TabsTrigger value="liked" onClick={() => setActiveTab('liked')}>
            <ThumbsUp className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Liked</span>
          </TabsTrigger>
          <TabsTrigger value="events" onClick={() => setActiveTab('events')}>
            <CalendarClock className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
          <TabsTrigger value="artists" onClick={() => setActiveTab('artists')}>
            <Users className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Artists</span>
          </TabsTrigger>
          <TabsTrigger value="genres" onClick={() => setActiveTab('genres')}>
            <Tag className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Genres</span>
          </TabsTrigger>
          <TabsTrigger value="venues" onClick={() => setActiveTab('venues')}>
            <Map className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Venues</span>
          </TabsTrigger>
          <TabsTrigger value="friends" onClick={() => setActiveTab('friends')}>
            <UserPlus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Friends</span>
          </TabsTrigger>
        </TabsList>

        {/* Saved Sets Tab */}
        <TabsContent value="saved" className="mt-0">
          <Card className="bg-gray-800 border-none">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg flex items-center">
                <Bookmark className="mr-2 h-5 w-5" />
                Saved for Later
              </CardTitle>
              <CardDescription>
                Sets you've saved to check out later
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[400px] pr-4">
                {isLoadingSavedSets ? (
                  <>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="mb-3">
                        <Skeleton className="h-20 w-full bg-gray-700 rounded-lg" />
                      </div>
                    ))}
                  </>
                ) : savedSets && savedSets.data?.length > 0 ? (
                  savedSets.data.map((set: SavedSet) => renderSetCard(set))
                ) : (
                  <div className="text-center p-6">
                    <Bookmark className="h-12 w-12 mx-auto text-gray-600 mb-2" />
                    <h4 className="text-gray-400 mb-1">No saved sets yet</h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Save sets from the discover page to listen to later
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setLocation('/discover')}>
                      Browse Discover
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Liked Sets Tab */}
        <TabsContent value="liked" className="mt-0">
          <Card className="bg-gray-800 border-none">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg flex items-center">
                <ThumbsUp className="mr-2 h-5 w-5" />
                Liked Sets
              </CardTitle>
              <CardDescription>
                Sets you've rated as "Liked"
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[400px] pr-4">
                {isLoadingLikedSets ? (
                  <>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="mb-3">
                        <Skeleton className="h-20 w-full bg-gray-700 rounded-lg" />
                      </div>
                    ))}
                  </>
                ) : likedSets && likedSets?.parsedData?.length > 0 ? (
                  likedSets?.parsedData?.map((set: SavedSet) => renderSetCard(set))
                ) : (
                  <div className="text-center p-6">
                    <ThumbsUp className="h-12 w-12 mx-auto text-gray-600 mb-2" />
                    <h4 className="text-gray-400 mb-1">No liked sets yet</h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Like sets when logging or rating to see them here
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setLocation('/log-set')}>
                      Log a Set
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="mt-0">
          <Card className="bg-gray-800 border-none">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg flex items-center">
                <CalendarClock className="mr-2 h-5 w-5" />
                Discover Events
              </CardTitle>
              <CardDescription>
                Upcoming events you might be interested in
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="text-center p-10">
                <div className="bg-amber-600/30 text-amber-300 text-xs px-3 py-1 rounded-full font-medium inline-block mb-4">
                  Coming Soon
                </div>
                <CalendarClock className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Events Integration Coming Soon</h3>
                <p className="text-gray-400 max-w-md mx-auto mb-4">
                  We're working on bringing you personalized live music events
                  from your favorite artists and venues. Check back soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Artists Tab */}
        <TabsContent value="artists" className="mt-0">
          <Card className="bg-gray-800 border-none">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Artists
              </CardTitle>
              <CardDescription>
                Artists you've liked or rated positively
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[400px] pr-4">
                {isLoadingLikedArtists ? (
                  <>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="mb-3">
                        <Skeleton className="h-16 w-full bg-gray-700 rounded-lg" />
                      </div>
                    ))}
                  </>
                ) : likedArtists && likedArtists.length > 0 ? (
                  likedArtists.map(artist => renderItemCard(artist))
                ) : (
                  <div className="text-center p-6">
                    <Users className="h-12 w-12 mx-auto text-gray-600 mb-2" />
                    <h4 className="text-gray-400 mb-1">No liked artists yet</h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Rate artists positively in your logs to see them here
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Genres Tab */}
        <TabsContent value="genres" className="mt-0">
          <Card className="bg-gray-800 border-none">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg flex items-center">
                <Tag className="mr-2 h-5 w-5" />
                Genres
              </CardTitle>
              <CardDescription>
                Genres you've selected as favorites
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {isLoadingLikedGenres ? (
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-8 w-20 bg-gray-700 rounded-full" />
                  ))}
                </div>
              ) : likedGenres && likedGenres.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {likedGenres.map(genre => (
                    <Badge
                      key={genre.id}
                      variant="secondary"
                      className="px-3 py-1 bg-amber-600/30 text-amber-300 hover:bg-amber-600/50"
                    >
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6">
                  <Tag className="h-12 w-12 mx-auto text-gray-600 mb-2" />
                  <h4 className="text-gray-400 mb-1">No genre preferences set</h4>
                  <p className="text-xs text-gray-500 mb-4">
                    Add genres during onboarding or in your profile settings
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Venues Tab */}
        <TabsContent value="venues" className="mt-0">
          <Card className="bg-gray-800 border-none">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg flex items-center">
                <Map className="mr-2 h-5 w-5" />
                Venues
              </CardTitle>
              <CardDescription>
                Venues you've visited and rated positively
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[400px] pr-4">
                {isLoadingLikedVenues ? (
                  <>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="mb-3">
                        <Skeleton className="h-16 w-full bg-gray-700 rounded-lg" />
                      </div>
                    ))}
                  </>
                ) : likedVenues && likedVenues.length > 0 ? (
                  likedVenues.map(venue => renderItemCard(venue))
                ) : (
                  <div className="text-center p-6">
                    <Map className="h-12 w-12 mx-auto text-gray-600 mb-2" />
                    <h4 className="text-gray-400 mb-1">No liked venues yet</h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Rate venues positively in your logs to see them here
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Friends Tab */}
        <TabsContent value="friends" className="mt-0">
          <Card className="bg-gray-800 border-none">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg flex items-center">
                <UserPlus className="mr-2 h-5 w-5" />
                Friends
              </CardTitle>
              <CardDescription>
                Connect with friends to share your music experiences
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {/* Add Friend Section */}
              <div className="mb-6 bg-gray-900 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3">Add a Friend</h4>
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    variant={addByEmail ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAddByEmail(true)}
                    className={addByEmail ? "bg-spotify-green text-black" : ""}
                  >
                    By Email
                  </Button>
                  <Button
                    variant={!addByEmail ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAddByEmail(false)}
                    className={!addByEmail ? "bg-spotify-green text-black" : ""}
                  >
                    By Username
                  </Button>
                </div>

                {addByEmail ? (
                  <div className="mb-3">
                    <Input
                      type="email"
                      placeholder="Enter friend's email"
                      value={friendEmail}
                      onChange={(e) => setFriendEmail(e.target.value)}
                      className="bg-gray-800 border-gray-700 mb-2"
                    />
                  </div>
                ) : (
                  <div className="mb-3">
                    <Input
                      type="text"
                      placeholder="Enter friend's username"
                      value={friendUsername}
                      onChange={(e) => setFriendUsername(e.target.value)}
                      className="bg-gray-800 border-gray-700 mb-2"
                    />
                  </div>
                )}

                <Button
                  onClick={handleAddFriend}
                  disabled={addFriendMutation.isPending}
                  className="w-full bg-spotify-green text-black"
                >
                  {addFriendMutation.isPending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Friend
                    </>
                  )}
                </Button>
              </div>

              {/* Friends List */}
              <ScrollArea className="h-[300px] pr-4">
                <h4 className="text-sm font-medium mb-3">Your Friends</h4>

                {isLoadingFriends ? (
                  <>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="mb-3">
                        <Skeleton className="h-16 w-full bg-gray-700 rounded-lg" />
                      </div>
                    ))}
                  </>
                ) : friends.length > 0 ? (
                  <div className="space-y-3">
                    {/* Pending Friend Requests Section */}
                    {friends.filter(friend => friend.status === 'pending' && !friend.is_requester).length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-xs text-gray-400 mb-2">Pending Requests</h5>
                        {friends
                          .filter(friend => friend.status === 'pending' && !friend.is_requester)
                          .map(friend => (
                            <Card key={friend.id} className="bg-gray-800 border-none rounded-lg overflow-hidden mb-3">
                              <div className="flex items-center p-3">
                                <div className="h-10 w-10 rounded-full bg-gray-700 mr-3 flex-shrink-0 flex items-center justify-center text-lg font-bold">
                                  {friend.avatar_url ? (
                                    <img src={friend.avatar_url} alt={friend.username} className="h-full w-full object-cover rounded-full" />
                                  ) : (
                                    friend?.username?.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="flex-grow">
                                  <p className="font-medium text-sm">{friend.username}</p>
                                  <p className="text-xs text-gray-400">{friend.email}</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => acceptFriendMutation.mutate(friend.id)}
                                  disabled={acceptFriendMutation.isPending}
                                  className="bg-transparent border border-spotify-green text-spotify-green hover:bg-spotify-green/10"
                                >
                                  Accept
                                </Button>
                              </div>
                            </Card>
                          ))}
                      </div>
                    )}

                    {/* Sent Friend Requests */}
                    {friends.filter(friend => friend.status === 'pending' && friend.is_requester).length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-xs text-gray-400 mb-2">Sent Requests</h5>
                        {friends
                          .filter(friend => friend.status === 'pending' && friend.is_requester)
                          .map(friend => (
                            <Card key={friend.id} className="bg-gray-800 border-none rounded-lg overflow-hidden mb-3">
                              <div className="flex items-center p-3">
                                <div className="h-10 w-10 rounded-full bg-gray-700 mr-3 flex-shrink-0 flex items-center justify-center text-lg font-bold">
                                  {friend.avatar_url ? (
                                    <img src={friend.avatar_url} alt={friend.username} className="h-full w-full object-cover rounded-full" />
                                  ) : (
                                    friend?.username?.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="flex-grow">
                                  <p className="font-medium text-sm">{friend.username}</p>
                                  <p className="text-xs text-gray-400">{friend.email}</p>
                                </div>
                                <Badge variant="outline" className="bg-transparent border-amber-500 text-amber-500">
                                  Pending
                                </Badge>
                              </div>
                            </Card>
                          ))}
                      </div>
                    )}

                    {/* Accepted Friends */}
                    {friends.filter(friend => friend.status === 'accepted').length > 0 && (
                      <div>
                        <h5 className="text-xs text-gray-400 mb-2">Friends</h5>
                        {friends
                          .filter(friend => friend.status === 'accepted')
                          .map(friend => (
                            <Card key={friend.id} className="bg-gray-800 border-none rounded-lg overflow-hidden mb-3">
                              <div className="flex items-center p-3">
                                <div className="h-10 w-10 rounded-full bg-gray-700 mr-3 flex-shrink-0 flex items-center justify-center text-lg font-bold">
                                  {friend.avatar_url ? (
                                    <img src={friend.avatar_url} alt={friend.username} className="h-full w-full object-cover rounded-full" />
                                  ) : (
                                    friend && friend?.username?.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="flex-grow">
                                  <p className="font-medium text-sm">{friend.username}</p>
                                  <p className="text-xs text-gray-400">{friend.email}</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeFriendMutation.mutate(friend.id)}
                                  disabled={removeFriendMutation.isPending}
                                  className="bg-transparent border-red-500 text-red-500 hover:bg-red-500/10"
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <UserPlus className="h-12 w-12 mx-auto text-gray-600 mb-2" />
                    <h4 className="text-gray-400 mb-1">No friends yet</h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Add friends by email or username to connect
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Account Settings */}
      <Card className="bg-gray-800 border-none rounded-lg mb-6">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full bg-transparent border border-red-500 text-red-500 rounded-lg py-6 hover:bg-red-900/10 transition-all"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

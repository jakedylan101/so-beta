import { Request, Response, NextFunction } from 'express';
import { getUserClient } from './supabase';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

// Extended Request type with user property
export interface AuthenticatedRequest extends Request {
  user?: any;
}

if (!process.env.SUPABASE_JWT_SECRET) {
  throw new Error('SUPABASE_JWT_SECRET is not set');
}

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error("Supabase environment variables missing");
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Middleware to extract the user from the session and attach to req
export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Log all headers for debugging
    console.log('[Auth] Request URL:', req.method, req.url);
    console.log('[Auth] All headers:', Object.keys(req.headers));
    console.log('[Auth] Auth header value:', req.headers.authorization);
    
    // Also check for lowercase header (some servers/proxies normalize header names)
    const normalizedAuthHeader = 
      req.headers.authorization || 
      req.headers['Authorization'] || 
      (req.headers as any)['authorization'] ||
      req.get('authorization') ||
      req.get('Authorization');
    
    console.log('[Auth] Normalized auth header:', normalizedAuthHeader ? 'present' : 'missing');
    
    // Check for the Authorization header first
    const authHeader = normalizedAuthHeader;
    
    if (!authHeader) {
      console.log('[Auth] No Authorization header found');
      // Log headers for debugging
      console.log('[Auth] Available headers:', Object.keys(req.headers).join(', '));
      return next();
    }
    
    // Extract the token from the Bearer format
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      console.log('[Auth] Invalid Authorization header format:', authHeader.substring(0, 20));
      return next();
    }
    
    const token = tokenParts[1];
    if (!token) {
      console.log('[Auth] No token found in Authorization header');
      return next();
    }
    
    // Log token details for debugging (safe prefix/suffix only)
    console.log(`[Auth] Processing token: ${token.substring(0, 10)}...${token.substring(token.length - 5)}`);
    console.log(`[Auth] Token length: ${token.length} characters`);
    
    try {
      // Create a client with the user's token
      const userClient = getUserClient(token);
      
      // Validate token using the user's client
      console.log('[Auth] Validating token...');
      const { data, error } = await userClient.auth.getUser();
      
      if (error) {
        console.error(`[Auth] Token validation failed:`, error);
        console.error(`[Auth] Error code: ${error.code}, message: ${error.message}`);
        return next();
      }
      
      if (!data || !data.user) {
        console.error(`[Auth] Token validation succeeded but no user data returned`);
        return next();
      }
      
      // Set the user on the request
      req.user = {
        id: data.user.id,
        email: data.user.email,
        app_metadata: data.user.app_metadata,
        user_metadata: data.user.user_metadata
      };
      
      console.log(`[Auth] Successfully authenticated user ${data.user.id} (${data.user.email})`);
      return next();
    } catch (tokenError) {
      console.error('[Auth] Exception during token validation:', tokenError);
      return next();
    }
  } catch (error) {
    console.error('[Auth] Unexpected error in auth middleware:', error);
    return next();
  }
}

// Helper middleware to require authentication
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as any;
    (req as any).user = { id: payload.sub };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
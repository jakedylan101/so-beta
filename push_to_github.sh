#!/bin/bash

# Script to push code to GitHub
echo "Pushing SoundOff project to GitHub repository: jakedylan101/so-u-2"

# Initialize git if needed
if [ ! -d ".git" ]; then
  echo "Initializing git repository..."
  git init
fi

# Configure Git (if needed)
if [ -z "$(git config --get user.name)" ]; then
  echo "Please enter your name for Git commits:"
  read git_name
  git config user.name "$git_name"
fi

if [ -z "$(git config --get user.email)" ]; then
  echo "Please enter your email for Git commits:"
  read git_email
  git config user.email "$git_email"
fi

# Add GitHub remote if not already set
if ! git remote | grep -q "origin"; then
  echo "Adding GitHub remote..."
  git remote add origin https://github.com/jakedylan101/so-u-2.git
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
  echo "Creating .gitignore file..."
  cat > .gitignore << EOF
node_modules/
.env
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.vscode/
dist/
build/
EOF
fi

# Stage changes
echo "Staging changes..."
git add .

# Commit changes
echo "Committing changes..."
echo "Enter commit message (e.g., 'Fix profile and discover page issues'):"
read commit_message
git commit -m "$commit_message"

# Push to GitHub
echo "Pushing to GitHub..."
echo "You may be prompted for your GitHub credentials."
git push -u origin main

echo "Push completed successfully!"
echo "Visit https://github.com/jakedylan101/so-u-2 to see your repository."
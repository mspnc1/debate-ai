#!/bin/bash

# Script to remove sensitive test files from git history
# WARNING: This will rewrite git history!

echo "This script will remove test files containing API keys from git history"
echo "WARNING: This will rewrite git history and require force push"
echo ""
echo "Files to remove:"
echo "- test-*.js"
echo "- test-*.mjs"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]
then
    # Remove test files from all commits
    git filter-branch --force --index-filter \
        'git rm --cached --ignore-unmatch test-*.js test-*.mjs' \
        --prune-empty --tag-name-filter cat -- --all
    
    echo ""
    echo "Git history has been rewritten."
    echo "Now you need to:"
    echo "1. Force push to remote: git push origin --force --all"
    echo "2. Tell any collaborators to re-clone the repository"
    echo ""
    echo "Also recommended:"
    echo "3. Clean up the refs: git for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin"
    echo "4. Expire reflog: git reflog expire --expire=now --all"
    echo "5. Garbage collect: git gc --prune=now --aggressive"
fi
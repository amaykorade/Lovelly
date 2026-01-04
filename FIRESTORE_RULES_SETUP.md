# Firestore Security Rules Setup

The "missing or insufficient permissions" error occurs because Firestore security rules need to be deployed to your Firebase project.

## 🚨 Quick Fix

You need to deploy the Firestore security rules to your Firebase project. Here's how:

### Option 1: Using Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase** (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your existing project: `lovelly-10644`
   - Use existing `firestore.rules` file: **Yes**
   - Use existing `firestore.indexes.json` file: **No** (or Yes if you have one)

4. **Deploy the rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Option 2: Using Firebase Console (Web UI)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `lovelly-10644`
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the contents of `firestore.rules` file
5. Paste into the rules editor
6. Click **Publish**

## 📋 What the Rules Do

The security rules allow:
- ✅ **Users**: Can read/write their own user document
- ✅ **Couples**: Can read/write if they're part of the couple
- ✅ **Messages**: Can read/write messages in their couple's chat
- ✅ **Events**: Can read/write calendar events
- ❌ **Everything else**: Denied by default

## 🔒 Security Rules Explained

```javascript
// Users can only access their own document
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

This ensures:
- Only authenticated users can access data
- Users can only modify their own profile
- Partners can read each other's data (via couples collection)

## ✅ After Deploying Rules

1. **Test the signup flow again**
2. The "missing or insufficient permissions" error should be gone
3. You should be able to save your profile (name, date of birth, photo)

## 🐛 Troubleshooting

### Error: "firebase: command not found"
- Install Firebase CLI: `npm install -g firebase-tools`

### Error: "Project not found"
- Make sure you're logged in: `firebase login`
- Select the correct project: `firebase use lovelly-10644`

### Rules not working after deployment
- Wait a few seconds for rules to propagate
- Clear app cache and try again
- Check Firebase Console → Firestore → Rules to verify rules are deployed

## 📝 Current Rules File

The rules file is located at: `/firestore.rules`

It includes rules for:
- `users` collection (user profiles)
- `couples` collection (partner connections)
- `messages` collection (chat messages)
- `events` collection (calendar events)

## 🚀 Quick Deploy Command

```bash
# One command to deploy rules
firebase deploy --only firestore:rules
```

After deploying, try signing up again - the permission error should be resolved!


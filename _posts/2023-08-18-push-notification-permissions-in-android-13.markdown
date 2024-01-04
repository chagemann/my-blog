---
layout: single
title:  "Push notification permissions in Android 13"
date:   2023-08-18 12:12:12 +1000
categories: android push support
show_date: true
---

In Android 13, Google changed the way how push notification opt-ins are handled. It is now required that obtain the permission from the user in order to send push notifications. This change is great for Android users in terms of privacy and control, but with it comes some adjustments that mobile app have to make.

### Apps targeting Android 13
If your app has been or will soon be updated to target Android 13, you'll need to initiate an opt-in prompt for new users before you can send them push notifications. You have the flexibility to trigger the push opt-in prompt at a time of your choosing, which increases the chance of obtaining opt-ins.

### Apps targeting Android 12 and lower
Prior to targeting Android 13, the push opt-in prompt will be triggered by the system itself for app users that have upgraded their OS to Android 13. This gives you no control over _when_ the user is prompted and the prompt itself will be generic.

Start targeting Android 13 as soon as possible. This will give you more control over how you prompt your users to opt-in to push notifications and increase your opt-in rate.  

### In the meantime
If your user reporting that they do not receive push notifcations, follow these steps to enable it manually. The UI and naming of the screens could vary, but the general flow should be the same.

1. Long press on the icon of the app for that you want to enable push notifications.
2. Tap on the `App info` icon.
3. Tap on `Notifications`.
4. Set toggle on for "All notifications".

The next steps are optional, but could also cause push notifications not to be shown. This turns off the `Battery optimization` for your app:

5. Go back to the `App info` screen.
6. Tap on `Battery`.
7. Select `Unrestricted`.





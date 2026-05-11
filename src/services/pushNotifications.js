import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export const setupPushNotifications = async (userId) => {
  if (!userId) return;
  if (Capacitor.getPlatform() !== 'android' && Capacitor.getPlatform() !== 'ios') {
    // Silently skip — push notifications are native-only
    return;
  }

  // Request permission to use push notifications
  // iOS will prompt user and return if they granted permission or not
  // Android will just grant without prompting
  const permStatus = await PushNotifications.requestPermissions();

  if (permStatus.receive === 'granted') {
    // Register with Apple / Google to receive push via APNS/FCM
    await PushNotifications.register();
  } else {
    toast.error('User denied permissions for push notifications.');
  }

  // On success, we should be able to receive notifications
  PushNotifications.addListener('registration', async (token) => {
    console.log('Push registration success, token: ' + token.value);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { fcmToken: token.value });
      console.log('Token saved to Firestore for user', userId);
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  });

  // Some issue with our setup and push will not work
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  // Show us the notification payload if the app is open on our device
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received: ', notification);
    toast.success(`New Notification: ${notification.title}`);
  });

  // Method called when tapping on a notification
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push action performed: ', notification);
  });
};

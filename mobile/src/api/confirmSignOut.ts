import { Alert } from 'react-native';

/**
 * Native confirm dialog in front of every sign-out button — logging out is
 * the one tap in the app you can't undo without retyping a password.
 */
export function confirmSignOut(signOut: () => Promise<void> | void) {
  Alert.alert('Log out?', "You'll need your password to sign back in.", [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
  ]);
}

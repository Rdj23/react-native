import auth from '@react-native-firebase/auth';
import CleverTap from 'clevertap-react-native';


export const updateCleverTapProfile = (user) => {
  if (!user) return;

  CleverTap.onUserLogin({
    Name: user.displayName || 'Unknown',
    
    Email: user.email,
    // You can add more properties like Phone, Gender, etc. if available
  });
};

export const registerWithEmail = async (email, password, name) => {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: name });

    // CleverTap integration
    updateCleverTapProfile(userCredential.user);

    return userCredential.user;
  } catch (error) {
    throw error;
  }
};


export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);

    // CleverTap integration
    updateCleverTapProfile(userCredential.user);

    return userCredential.user;
  } catch (error) {
    throw error;
  }
};


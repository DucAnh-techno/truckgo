import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import { COLLECTIONS, type User, type UserRole } from "@/types";
import { auth, ensureFirebaseConfigured } from "@/lib/firebase/config";
import {
  getUserProfileById,
  normalizeUserProfile,
  syncPublicUserProfile,
} from "@/lib/services/users";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function getCurrentUser() {
  if (!auth?.currentUser) {
    return null;
  }

  const profile = await getUserProfile(auth.currentUser.uid);
  return profile;
}

export async function getUserProfile(userId: string) {
  return getUserProfileById(userId);
}

export async function registerWithEmail({
  name,
  email,
  password,
  role,
}: RegisterInput) {
  const firebase = ensureFirebaseConfigured();
  const credential = await createUserWithEmailAndPassword(
    firebase.auth,
    email,
    password
  );

  await updateProfile(credential.user, {
    displayName: name,
  });

  const profile: User = {
    ...normalizeUserProfile(credential.user.uid, {
      name,
      email,
      role,
      isVerified: false,
      emailVerified: credential.user.emailVerified,
      verificationDocs: [],
      verificationStatus: "unsubmitted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  };

  try {
    await setDoc(doc(firebase.db, COLLECTIONS.users, credential.user.uid), profile);
    await syncPublicUserProfile(profile);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Tài khoản Auth đã được tạo nhưng lưu Firestore thất bại: ${error.message}`
        : "Tài khoản Auth đã được tạo nhưng lưu Firestore thất bại."
    );
  }

  await sendEmailVerification(credential.user);

  return profile;
}

export async function loginWithEmail({ email, password }: LoginInput) {
  const firebase = ensureFirebaseConfigured();
  const credential = await signInWithEmailAndPassword(
    firebase.auth,
    email,
    password
  );

  const existingProfile = await getUserProfile(credential.user.uid);

  if (!existingProfile) {
    const fallbackProfile: User = normalizeUserProfile(credential.user.uid, {
      name: credential.user.displayName || email.split("@")[0],
      email: credential.user.email || email,
      role: "renter",
      isVerified: false,
      emailVerified: credential.user.emailVerified,
      verificationDocs: [],
      verificationStatus: "unsubmitted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    try {
      await setDoc(
        doc(firebase.db, COLLECTIONS.users, credential.user.uid),
        fallbackProfile
      );
      await syncPublicUserProfile(fallbackProfile);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Đăng nhập thành công nhưng tạo hồ sơ Firestore thất bại: ${error.message}`
          : "Đăng nhập thành công nhưng tạo hồ sơ Firestore thất bại."
      );
    }

    return fallbackProfile;
  }

  if (existingProfile.emailVerified !== credential.user.emailVerified) {
    const refreshedProfile: User = normalizeUserProfile(existingProfile.id, {
      ...existingProfile,
      emailVerified: credential.user.emailVerified,
      updatedAt: new Date().toISOString(),
    });

    await setDoc(
      doc(firebase.db, COLLECTIONS.users, credential.user.uid),
      refreshedProfile,
      { merge: true }
    );
    await syncPublicUserProfile(refreshedProfile);

    return refreshedProfile;
  }

  await syncPublicUserProfile(existingProfile);

  return existingProfile;
}

export async function logoutUser() {
  if (!auth) {
    return;
  }

  await signOut(auth);
}

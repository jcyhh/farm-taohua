import { Api, UserProfile } from '../Config/Api';

type UserProfileListener = (userInfo: UserProfile | null) => void;

export class UserProfileStore {
    private static currentUser: UserProfile | null = null;
    private static readonly listeners = new Set<UserProfileListener>();

    static getCurrentUser() {
        return this.currentUser;
    }

    static subscribe(listener: UserProfileListener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    static async refresh() {
        try {
            const userInfo = await Api.userMy();
            this.currentUser = userInfo;
            this.notify();
            return userInfo;
        } catch (error) {
            this.currentUser = null;
            this.notify();
            throw error;
        }
    }

    private static notify() {
        for (const listener of this.listeners) {
            listener(this.currentUser);
        }
    }
}

import { useSelector } from 'react-redux';
import { RootState } from '../store';

export const useAuth = () => {
  const user = useSelector((state: RootState) => state.user.currentUser);
  const isAuthenticated = !!user;
  const isPremium = user?.subscription === 'pro' || user?.subscription === 'business';
  
  return {
    user,
    isAuthenticated,
    isPremium,
  };
};
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  sub: string;
  username: string;
  exp: number;
  // Add other fields that your JWT contains
}

export const getJwtToken = () => {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('jwt='))
    ?.split('=')[1];
};

export const getUser = () => {
  const token = getJwtToken();
  if (!token) return null;
  
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    // Check if token is expired
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return null;
    }
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};


// Example usage in a component

const user = getUser();
if (user) {
  console.log('Username:', user.username);
  console.log('User ID:', user.sub);
}






import { createContext, useReducer, useEffect } from 'react';

export const AuthContext = createContext();

const initialState = {
  user: null,   // { email, role, token, ...meta }
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { user: action.payload };
    case 'LOGOUT':
      return { user: null };
    case 'UPDATE':
      return { user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('felicity_user');
      if (saved) {
        dispatch({ type: 'LOGIN', payload: JSON.parse(saved) });
      }
    } catch {
      localStorage.removeItem('felicity_user');
    }
  }, []);

  // Persist whenever user changes
  useEffect(() => {
    if (state.user) {
      localStorage.setItem('felicity_user', JSON.stringify(state.user));
    } else {
      localStorage.removeItem('felicity_user');
    }
  }, [state.user]);

  const login = (userData) => dispatch({ type: 'LOGIN', payload: userData });

  const logout = () => {
    localStorage.removeItem('felicity_user');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (fields) => dispatch({ type: 'UPDATE', payload: fields });

  return (
    <AuthContext.Provider value={{ user: state.user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

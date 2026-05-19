import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock the useAuth hook
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: '123', displayName: 'Test User' },
    loading: false
  })
}));

describe('App Component', () => {
  it('renders Home page by default for authenticated users', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    expect(screen.getByText('Our Moments')).toBeInTheDocument();
  });
});

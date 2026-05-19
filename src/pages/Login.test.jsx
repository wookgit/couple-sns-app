import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Login from './Login';

describe('Login Component', () => {
  it('renders login title and google login button', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Our Moments')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /구글 계정으로 시작하기/i })).toBeInTheDocument();
  });
});

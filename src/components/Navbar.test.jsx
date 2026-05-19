import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Navbar from './Navbar';

describe('Navbar Component', () => {
  it('renders three main navigation links', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    
    expect(screen.getByText('홈')).toBeInTheDocument();
    expect(screen.getByText('캘린더')).toBeInTheDocument();
    expect(screen.getByText('설정')).toBeInTheDocument();
  });

  it('has a premium glassmorphism class', () => {
    const { container } = render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    
    const navElement = container.querySelector('nav');
    expect(navElement).toHaveClass('glass-nav');
  });
});

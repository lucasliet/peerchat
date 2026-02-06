import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Logo } from './Logo';

describe('Logo', () => {
  describe('Rendering', () => {
    it('should render an SVG element', () => {
      const { container } = render(<Logo />);
      const svg = container.querySelector('svg');
      
      expect(svg).toBeInTheDocument();
    });

    it('should have correct SVG attributes', () => {
      const { container } = render(<Logo />);
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('fill', 'none');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
      expect(svg).toHaveAttribute('stroke-width', '2');
    });

    it('should contain expected SVG paths and shapes', () => {
      const { container } = render(<Logo />);
      
      const path = container.querySelector('path');
      const circles = container.querySelectorAll('circle');
      const line = container.querySelector('line');
      
      expect(path).toBeInTheDocument();
      expect(circles).toHaveLength(2);
      expect(line).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply default className when not provided', () => {
      const { container } = render(<Logo />);
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveClass('w-8');
      expect(svg).toHaveClass('h-8');
      expect(svg).toHaveClass('text-white');
    });

    it('should apply custom className when provided', () => {
      const customClass = 'w-16 h-16 text-blue-500';
      const { container } = render(<Logo className={customClass} />);
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveClass('w-16');
      expect(svg).toHaveClass('h-16');
      expect(svg).toHaveClass('text-blue-500');
    });

    it('should override default className with custom one', () => {
      const customClass = 'w-12 h-12';
      const { container } = render(<Logo className={customClass} />);
      const svg = container.querySelector('svg');
      
      expect(svg).not.toHaveClass('w-8');
      expect(svg).toHaveClass('w-12');
    });
  });

  describe('SVG Structure', () => {
    it('should have chat bubble path with correct styling', () => {
      const { container } = render(<Logo />);
      const path = container.querySelector('path');
      
      expect(path).toHaveAttribute('fill', 'currentColor');
      expect(path).toHaveAttribute('fill-opacity', '0.2');
    });

    it('should have two eye circles with correct styling', () => {
      const { container } = render(<Logo />);
      const circles = container.querySelectorAll('circle');
      
      circles.forEach(circle => {
        expect(circle).toHaveAttribute('fill', 'currentColor');
        expect(circle).toHaveAttribute('stroke', 'none');
        expect(circle).toHaveAttribute('r', '1.5');
      });
    });

    it('should have mouth line between the eyes', () => {
      const { container } = render(<Logo />);
      const line = container.querySelector('line');
      
      expect(line).toHaveAttribute('x1', '10');
      expect(line).toHaveAttribute('y1', '10');
      expect(line).toHaveAttribute('x2', '14');
      expect(line).toHaveAttribute('y2', '10');
    });
  });
});

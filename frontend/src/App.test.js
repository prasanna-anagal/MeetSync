import { render, screen } from '@testing-library/react';
import App from './App';

test('renders landing page at root path', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /meetsync/i });
  expect(heading).toBeInTheDocument();
});

import { render, screen } from '@testing-library/react';
import App from './App';

test('renders landing page at root path', () => {
  render(<App />);
  const heading = screen.getByText(/landing page/i);
  expect(heading).toBeInTheDocument();
});

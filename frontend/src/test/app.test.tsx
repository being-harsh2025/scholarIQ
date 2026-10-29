import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, Button, Badge, Alert } from '../components/ui';

describe('UI Primitives and Design System', () => {
  it('renders Card with title and subtitle correctly', () => {
    render(
      <Card title="Test Model Performance" subtitle="Evaluation benchmark on held-out split">
        <div>Card Content</div>
      </Card>
    );

    expect(screen.getByText('Test Model Performance')).toBeInTheDocument();
    expect(screen.getByText('Evaluation benchmark on held-out split')).toBeInTheDocument();
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('renders Button with variants and loading state', () => {
    const { rerender } = render(
      <Button variant="primary">Train Model</Button>
    );
    expect(screen.getByText('Train Model')).toBeInTheDocument();

    rerender(
      <Button variant="primary" loading={true}>Train Model</Button>
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('renders Alert component with title and styling', () => {
    render(
      <Alert type="warning" title="Data Leakage Prevention">
        Target variable is strictly excluded from feature space.
      </Alert>
    );

    expect(screen.getByText('Data Leakage Prevention')).toBeInTheDocument();
    expect(screen.getByText('Target variable is strictly excluded from feature space.')).toBeInTheDocument();
  });

  it('renders Badge with correct text', () => {
    render(<Badge variant="brand">Regression</Badge>);
    expect(screen.getByText('Regression')).toBeInTheDocument();
  });
});

describe('Login Flow', () => {
  beforeEach(() => {
    // Intercept auth session check on load to return null (not logged in)
    cy.intercept('GET', '**/api/auth/me', { statusCode: 401, body: { error: 'Unauthorized' } }).as('sessionCheck');

    // Intercept login request
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com'
        }
      }
    }).as('loginRequest');

    // Intercept subsequent session check after login
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          userId: 'test-user-id',
          email: 'test@example.com'
        }
      }
    }).as('sessionCheckSuccess');

    // Intercept emails fetching for dashboard to avoid errors
    cy.intercept('GET', '**/api/emails*', {
      statusCode: 200,
      body: {
        emails: [],
        total: 0,
        limit: 20,
        offset: 0
      }
    }).as('getEmails');
  });

  it('should successfully log in and redirect to dashboard', () => {
    cy.visit('/login');

    // Enter email and password
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');

    // Submit form
    cy.get('button[type="submit"]').click();

    // Verify redirected to dashboard
    cy.url().should('include', '/dashboard');
  });
});

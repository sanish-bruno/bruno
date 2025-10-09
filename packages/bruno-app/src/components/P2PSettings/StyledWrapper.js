import styled from 'styled-components';

const StyledWrapper = styled.div`
  .p2p-settings {
    background: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
  }

  .p2p-header {
    border-bottom: 1px solid ${props => props.theme.colors.border};
  }

  .p2p-status-card {
    background: ${props => props.theme.colors.backgroundSecondary};
    border: 1px solid ${props => props.theme.colors.border};
  }

  .p2p-space-card {
    background: ${props => props.theme.colors.backgroundSecondary};
    border: 1px solid ${props => props.theme.colors.border};
    
    &:hover {
      background: ${props => props.theme.colors.backgroundHover};
    }
  }

  .p2p-button {
    transition: all 0.2s ease;
    
    &:hover {
      transform: translateY(-1px);
    }
    
    &:active {
      transform: translateY(0);
    }
  }

  .p2p-button-primary {
    background: ${props => props.theme.colors.primary};
    color: white;
    
    &:hover {
      background: ${props => props.theme.colors.primaryHover};
    }
  }

  .p2p-button-secondary {
    background: ${props => props.theme.colors.backgroundSecondary};
    color: ${props => props.theme.colors.text};
    border: 1px solid ${props => props.theme.colors.border};
    
    &:hover {
      background: ${props => props.theme.colors.backgroundHover};
    }
  }

  .p2p-input {
    background: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    border: 1px solid ${props => props.theme.colors.border};
    
    &:focus {
      outline: none;
      border-color: ${props => props.theme.colors.primary};
      box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}20;
    }
  }

  .p2p-invite-link {
    background: ${props => props.theme.colors.primary}10;
    border: 1px solid ${props => props.theme.colors.primary}30;
  }

  .p2p-error {
    background: ${props => props.theme.colors.error}10;
    border: 1px solid ${props => props.theme.colors.error}30;
    color: ${props => props.theme.colors.error};
  }

  .p2p-success {
    background: ${props => props.theme.colors.success}10;
    border: 1px solid ${props => props.theme.colors.success}30;
    color: ${props => props.theme.colors.success};
  }
`;

export default StyledWrapper;

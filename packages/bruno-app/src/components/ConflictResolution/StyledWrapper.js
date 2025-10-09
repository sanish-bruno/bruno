import styled from 'styled-components';

const StyledWrapper = styled.div`
  .conflict-resolution {
    background: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
  }

  .conflict-header {
    border-bottom: 1px solid ${props => props.theme.colors.border};
  }

  .conflict-file-info {
    background: ${props => props.theme.colors.backgroundSecondary};
    border: 1px solid ${props => props.theme.colors.border};
  }

  .conflict-content-local {
    background: ${props => props.theme.colors.primary}10;
    border: 1px solid ${props => props.theme.colors.primary}30;
  }

  .conflict-content-incoming {
    background: ${props => props.theme.colors.success}10;
    border: 1px solid ${props => props.theme.colors.success}30;
  }

  .conflict-content-merged {
    background: ${props => props.theme.colors.background};
    border: 1px solid ${props => props.theme.colors.border};
    
    &:focus {
      outline: none;
      border-color: ${props => props.theme.colors.primary};
      box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}20;
    }
  }

  .conflict-radio {
    &:checked {
      color: ${props => props.theme.colors.primary};
    }
  }

  .conflict-button {
    transition: all 0.2s ease;
    
    &:hover:not(:disabled) {
      transform: translateY(-1px);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
    }
  }

  .conflict-button-primary {
    background: ${props => props.theme.colors.primary};
    color: white;
    
    &:hover:not(:disabled) {
      background: ${props => props.theme.colors.primaryHover};
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .conflict-button-secondary {
    background: ${props => props.theme.colors.backgroundSecondary};
    color: ${props => props.theme.colors.text};
    border: 1px solid ${props => props.theme.colors.border};
    
    &:hover:not(:disabled) {
      background: ${props => props.theme.colors.backgroundHover};
    }
  }

  .conflict-warning {
    background: ${props => props.theme.colors.warning}10;
    border: 1px solid ${props => props.theme.colors.warning}30;
    color: ${props => props.theme.colors.warning};
  }
`;

export default StyledWrapper;

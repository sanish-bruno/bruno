import styled from 'styled-components';

const StyledWrapper = styled.div`
  .form-group {
    margin-bottom: 20px;

    .form-label {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 500;
      color: ${(props) => props.theme.text};
    }

    .form-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid ${(props) => props.theme.input.border};
      border-radius: 3px;
      background: ${(props) => props.theme.input.bg};
      color: ${(props) => props.theme.text};
      font-size: 12px;
      transition: border-color 0.2s ease;

      &:focus {
        outline: none;
        border-color: ${(props) => props.theme.input.focusBorder};
      }

      &::placeholder {
        color: ${(props) => props.theme.input.placeholder.color};
      }
    }

    .form-slider {
      width: 100%;
      margin: 8px 0;
    }

    .form-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: ${(props) => props.theme.text};
      cursor: pointer;

      input[type="checkbox"] {
        margin: 0;
      }
    }

    .form-description {
      margin-top: 4px;
      font-size: 11px;
      color: ${(props) => props.theme.colors.text.muted};
      line-height: 1.3;
    }

    .form-error {
      margin-top: 4px;
      font-size: 11px;
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .form-error-message {
    padding: 8px 12px;
    background: ${(props) => props.theme.colors.bg.danger}20;
    color: ${(props) => props.theme.colors.text.danger};
    border-radius: 3px;
    font-size: 11px;
    margin-bottom: 16px;
  }

  .test-connection {
    margin-top: 16px;
    padding: 12px;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 3px;
    background: ${(props) => props.theme.sidebar.bg};

    .test-button {
      padding: 8px 16px;
      background: ${(props) => props.theme.brand};
      color: #fff;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        opacity: 0.9;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .test-result {
      margin-top: 8px;
      padding: 8px 12px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;

      &.success {
        background: ${(props) => props.theme.colors.text.green}20;
        color: ${(props) => props.theme.colors.text.green};
      }

      &.failed {
        background: ${(props) => props.theme.colors.bg.danger}20;
        color: ${(props) => props.theme.colors.text.danger};
      }
    }
  }
`;

export default StyledWrapper;

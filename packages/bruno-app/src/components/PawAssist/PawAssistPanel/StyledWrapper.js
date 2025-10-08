import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  width: 450px;
  height: 100%;
  background: ${(props) => props.theme.bg};
  border-left: 1px solid ${(props) => props.theme?.input?.border || '#e0e0e0'};
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: ${(props) => props.theme?.fonts?.primary || props.theme?.fontFamily || 'inherit'};

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid ${(props) => props.theme?.input?.border || '#e0e0e0'};
    background: ${(props) => props.theme?.sidebar?.bg || props.theme?.bg || '#f5f5f5'};
    min-height: 60px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;

      .paw-icon {
        width: 20px;
        height: 20px;
        color: ${(props) => props.theme?.colors?.text?.yellow || '#ffa500'};
      }

      .header-title {
        font-size: 14px;
        font-weight: 600;
        color: ${(props) => props.theme?.text || '#333'};
        margin: 0;
      }
    }

    .tabs {
      display: flex;
      gap: 4px;
      background: ${(props) => props.theme?.bg || '#fff'};
      padding: 4px;
      border-radius: 6px;
      border: 1px solid ${(props) => props.theme?.input?.border || '#e0e0e0'};

      .tab {
        padding: 8px 16px;
        background: transparent;
        color: ${(props) => props.theme?.text || '#333'};
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s ease;
        white-space: nowrap;

        &:hover {
          background: ${(props) => props.theme?.sidebar?.bg || props.theme?.bg || '#f5f5f5'};
        }

        &.active {
          background: ${(props) => props.theme?.brand || '#007acc'};
          color: #fff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      }
    }

    .close-button {
      width: 32px;
      height: 32px;
      background: transparent;
      color: ${(props) => props.theme?.text || '#333'};
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 18px;
      font-weight: 400;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      &:hover {
        background: ${(props) => props.theme?.sidebar?.bg || props.theme?.bg || '#f5f5f5'};
        color: ${(props) => props.theme?.colors?.text?.danger || '#dc3545'};
      }
    }
  }

  .panel-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .input-section {
      padding: 20px;
      border-bottom: 1px solid ${(props) => props.theme?.input?.border || '#e0e0e0'};

      .input-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: ${(props) => props.theme?.text || '#333'};
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .prompt-input {
        width: 100%;
        min-height: 100px;
        padding: 12px 16px;
        border: 1px solid ${(props) => props.theme?.input?.border || '#e0e0e0'};
        border-radius: 8px;
        background: ${(props) => props.theme?.input?.bg || props.theme?.bg || '#fff'};
        color: ${(props) => props.theme?.text || '#333'};
        font-family: ${(props) => props.theme?.fonts?.primary || props.theme?.fontFamily || 'inherit'};
        font-size: 13px;
        line-height: 1.5;
        resize: vertical;
        margin-bottom: 16px;
        transition: all 0.2s ease;

        &:focus {
          outline: none;
          border-color: ${(props) => props.theme?.brand || '#007acc'};
          box-shadow: 0 0 0 3px ${(props) => (props.theme?.brand || '#007acc') + '20'};
        }

        &::placeholder {
          color: ${(props) => props.theme?.input?.placeholder?.color || props.theme?.text || '#999'};
          font-style: italic;
        }
      }

      .action-buttons {
        display: flex;
        gap: 12px;
        justify-content: flex-end;

        .generate-button {
          padding: 10px 24px;
          background: ${(props) => props.theme?.brand || '#007acc'};
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 120px;
          justify-content: center;

          &:hover:not(:disabled) {
            background: ${(props) => props.theme?.brand || '#007acc'};
            transform: translateY(-1px);
            box-shadow: 0 4px 12px ${(props) => (props.theme?.brand || '#007acc') + '40'};
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }

          .loading-spinner {
            width: 14px;
            height: 14px;
            border: 2px solid transparent;
            border-top: 2px solid currentColor;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        }
      }
    }

    .error-section {
      padding: 20px;
      border-bottom: 1px solid ${(props) => props.theme?.input?.border || '#e0e0e0'};
      background: ${(props) => (props.theme?.colors?.bg?.danger || '#f8d7da') + '10'};

      .error-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;

        .error-icon {
          width: 20px;
          height: 20px;
          color: ${(props) => props.theme?.colors?.text?.danger || '#dc3545'};
          flex-shrink: 0;
          margin-top: 2px;
        }

        .error-details {
          flex: 1;

          .error-message {
            color: ${(props) => props.theme?.colors?.text?.danger || '#dc3545'};
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 12px;
            line-height: 1.4;
          }

          .retry-button {
            padding: 8px 16px;
            background: ${(props) => props.theme?.brand || '#007acc'};
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 6px;

            &:hover {
              background: ${(props) => props.theme?.brand || '#007acc'};
              transform: translateY(-1px);
              box-shadow: 0 4px 12px ${(props) => (props.theme?.brand || '#007acc') + '40'};
            }
          }
        }
      }
    }

    .response-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      .response-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid ${(props) => props.theme?.input?.border || '#e0e0e0'};
        background: ${(props) => props.theme?.sidebar?.bg || props.theme?.bg || '#f5f5f5'};
        min-height: 60px;

        .response-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: ${(props) => props.theme?.text || '#333'};
          margin: 0;

          .success-icon {
            width: 16px;
            height: 16px;
            color: ${(props) => props.theme?.colors?.text?.green || '#28a745'};
          }
        }

        .response-actions {
          display: flex;
          gap: 8px;

          .action-button {
            padding: 8px 16px;
            background: ${(props) => props.theme?.button?.secondary?.bg || props.theme?.bg || '#fff'};
            color: ${(props) => props.theme?.button?.secondary?.color || props.theme?.text || '#333'};
            border: 1px solid ${(props) => props.theme?.button?.secondary?.border || props.theme?.input?.border || '#e0e0e0'};
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;

            &:hover {
              border-color: ${(props) => props.theme?.button?.secondary?.hoverBorder || props.theme?.input?.border || '#e0e0e0'};
              background: ${(props) => props.theme?.sidebar?.bg || props.theme?.bg || '#f5f5f5'};
              transform: translateY(-1px);
            }

            &.primary {
              background: ${(props) => props.theme?.brand || '#007acc'};
              color: #fff;
              border-color: ${(props) => props.theme?.brand || '#007acc'};

              &:hover {
                background: ${(props) => props.theme?.brand || '#007acc'};
                transform: translateY(-1px);
                box-shadow: 0 4px 12px ${(props) => (props.theme?.brand || '#007acc') + '40'};
              }
            }
          }
        }
      }

      .response-code {
        flex: 1;
        margin: 0;
        padding: 20px;
        background: ${(props) => props.theme?.codemirror?.bg || props.theme?.bg || '#fff'};
        color: ${(props) => props.theme?.text || '#333'};
        font-family: ${(props) => props.theme?.fonts?.code || props.theme?.fontFamily || 'monospace'};
        font-size: 13px;
        line-height: 1.6;
        overflow: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        border-radius: 0 0 8px 8px;
        position: relative;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, ${(props) => props.theme?.input?.border || '#e0e0e0'}, transparent);
        }

        code {
          background: none;
          padding: 0;
          color: inherit;
          font-family: inherit;
          font-size: inherit;
        }

        /* Basic syntax highlighting */
        .keyword { color: #0000ff; }
        .string { color: #008000; }
        .number { color: #ff0000; }
        .comment { color: #808080; }
        .function { color: #800080; }
      }
    }
  }
`;

export default StyledWrapper;

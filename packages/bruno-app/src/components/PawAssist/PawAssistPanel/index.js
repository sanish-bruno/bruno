import React, { useState, useEffect } from 'react';
import { useTheme } from 'providers/Theme';
import { useEditorGateway } from 'hooks/useEditorGateway';
import StyledWrapper from './StyledWrapper';

const PawAssistPanel = ({
  scriptType = 'pre',
  editorRef,
  onClose,
  isVisible = false
}) => {
  const { theme } = useTheme();
  const editorGateway = useEditorGateway(editorRef);

  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [activeTab, setActiveTab] = useState('generate'); // 'generate' or 'convert'

  // Check if Paw Assist is configured on mount
  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const result = await window.pawAssist.getSettings();
      if (result.ok) {
        setIsConfigured(result.isConfigured);
      }
    } catch (err) {
      console.error('Failed to check Paw Assist configuration:', err);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (!isConfigured) {
      setError('Paw Assist is not configured. Please configure it in Preferences.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const messages = [
        {
          role: 'system',
          content: `You are Paw Assist, an AI helper inside Bruno (an API client).
Output only JavaScript code suitable for Bruno's scripting environment.

BRUNO API REFERENCE:
Variables: bru.setVar("key", value), bru.getVar("key")
Request: bru.setHeader("name", "value"), bru.setBody(body)
Response: res.getStatus(), res.json()
Assertions: bru.assert(condition, "message"), bru.assertEqual(actual, expected, "message")
Console: console.log(...args)

CONTEXT:
${scriptType === 'pre' ? `
PRE-REQUEST SCRIPT:
- Runs before sending the request
- Use bru.setVar() to set variables
- Use bru.setHeader() to set request headers
- Use bru.setBody() to set request body
- Use bru.setMethod() to set HTTP method
- Use bru.setUrl() to set request URL
- Use bru.setQueryParam() for query parameters
- Use bru.setPathParam() for path parameters
- Use bru.getVar() to read variables
- Use bru.getEnv() to read environment variables` : `
POST-RESPONSE/TEST SCRIPT:
- Runs after receiving the response
- Use res.getStatus() to get HTTP status code
- Use res.getHeaders() to get all response headers
- Use res.getHeader("name") to get specific header
- Use res.json() to parse JSON response body
- Use res.text() to get raw response body
- Use res.getTime() to get response time
- Use bru.assert() for assertions
- Use bru.assertEqual(), bru.assertTrue(), etc. for specific assertions
- Use bru.setVar() to save response data for later use
- Use console.log() for debugging`}

IMPORTANT:
- Output ONLY JavaScript code, no explanations
- Use proper Bruno API methods
- Include error handling where appropriate
- Use async/await for asynchronous operations
- Use try-catch for error handling`
        },
        {
          role: 'user',
          content: `Generate a Bruno ${scriptType}-request script for: ${prompt}`
        }
      ];

      const result = await window.pawAssist.generate({
        messages,
        contextMeta: { scriptType, lang: 'js' }
      });

      if (result.ok) {
        setResponse(result.content);
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError('Failed to generate code. Please try again.');
      console.error('Paw Assist generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertPostman = async () => {
    if (!prompt.trim()) {
      setError('Please paste your Postman code');
      return;
    }

    if (!isConfigured) {
      setError('Paw Assist is not configured. Please configure it in Preferences.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.pawAssist.convertPostman({
        code: prompt,
        contextType: scriptType
      });

      if (result.ok) {
        setResponse(result.content);
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError('Failed to convert Postman code. Please try again.');
      console.error('Paw Assist conversion error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (response && editorGateway) {
      editorGateway.insertAtSelection(response);
    }
  };

  const handleCopy = () => {
    if (response) {
      navigator.clipboard.writeText(response);
    }
  };

  const handleRetry = () => {
    if (activeTab === 'generate') {
      handleGenerate();
    } else {
      handleConvertPostman();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <StyledWrapper theme={theme} className="paw-assist-panel">
      <div className="panel-header">
        <div className="header-left">
          <svg
            className="paw-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 10c-1.32 0 -1.983 .421 -2.931 1.924l-.244 .398l-.395 .688a50.89 50.89 0 0 0 -.141 .254c-.24 .434 -.571 .753 -1.139 1.142l-.55 .365c-.94 .627 -1.432 1.118 -1.707 1.955c-.124 .338 -.196 .853 -.193 1.28c0 1.687 1.198 2.994 2.8 2.994l.242 -.006c.119 -.006 .234 -.017 .354 -.034l.248 -.043l.132 -.028l.291 -.073l.162 -.045l.57 -.17l.763 -.243l.455 -.136c.53 -.15 .94 -.222 1.283 -.222c.344 0 .753 .073 1.283 .222l.455 .136l.764 .242l.569 .171l.312 .084c.097 .024 .187 .045 .273 .062l.248 .043c.12 .017 .235 .028 .354 .034l.242 .006c1.602 0 2.8 -1.307 2.8 -3c0 -.427 -.073 -.939 -.207 -1.306c-.236 -.724 -.677 -1.223 -1.48 -1.83l-.257 -.19l-.528 -.38c-.642 -.47 -1.003 -.826 -1.253 -1.278l-.27 -.485l-.252 -.432c-1.011 -1.696 -1.618 -2.099 -3.053 -2.099z" />
            <path d="M19.78 7h-.03c-1.219 .02 -2.35 1.066 -2.908 2.504c-.69 1.775 -.348 3.72 1.075 4.333c.256 .109 .527 .163 .801 .163c1.231 0 2.38 -1.053 2.943 -2.504c.686 -1.774 .34 -3.72 -1.076 -4.332a2.05 2.05 0 0 0 -.804 -.164z" />
            <path d="M9.025 3c-.112 0 -.185 .002 -.27 .015l-.093 .016c-1.532 .206 -2.397 1.989 -2.108 3.855c.272 1.725 1.462 3.114 2.92 3.114l.187 -.005a1.26 1.26 0 0 0 .084 -.01l.092 -.016c1.533 -.206 2.397 -1.989 2.108 -3.855c-.27 -1.727 -1.46 -3.114 -2.92 -3.114z" />
            <path d="M14.972 3c-1.459 0 -2.647 1.388 -2.916 3.113c-.29 1.867 .574 3.65 2.174 3.867c.103 .013 .2 .02 .296 .02c1.39 0 2.543 -1.265 2.877 -2.883l.041 -.23c.29 -1.867 -.574 -3.65 -2.174 -3.867a2.154 2.154 0 0 0 -.298 -.02z" />
            <path d="M4.217 7c-.274 0 -.544 .054 -.797 .161c-1.426 .615 -1.767 2.562 -1.078 4.335c.563 1.451 1.71 2.504 2.941 2.504c.274 0 .544 -.054 .797 -.161c1.426 -.615 1.767 -2.562 1.078 -4.335c-.563 -1.451 -1.71 -2.504 -2.941 -2.504z" />
          </svg>
          <h3 className="header-title">Paw Assist</h3>
        </div>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            Generate
          </button>
          <button
            className={`tab ${activeTab === 'convert' ? 'active' : ''}`}
            onClick={() => setActiveTab('convert')}
          >
            Convert Postman
          </button>
        </div>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="panel-content">
        <div className="input-section">
          <label className="input-label">
            {activeTab === 'generate' ? 'Describe your script' : 'Postman code to convert'}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              activeTab === 'generate'
                ? `Describe what you want your ${scriptType}-request script to do...`
                : 'Paste your Postman code here...'
            }
            className="prompt-input"
            rows={4}
          />

          <div className="action-buttons">
            <button
              onClick={activeTab === 'generate' ? handleGenerate : handleConvertPostman}
              disabled={loading || !prompt.trim()}
              className="generate-button"
            >
              {loading && <div className="loading-spinner" />}
              {loading ? 'Generating...' : (activeTab === 'generate' ? 'Generate Code' : 'Convert Code')}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-section">
            <div className="error-content">
              <svg className="error-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <div className="error-details">
                <div className="error-message">{error}</div>
                <button onClick={handleRetry} className="retry-button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                  </svg>
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {response && (
          <div className="response-section">
            <div className="response-header">
              <h4 className="response-title">
                <svg className="success-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                Generated Code
              </h4>
              <div className="response-actions">
                <button onClick={handleCopy} className="action-button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                  </svg>
                  Copy
                </button>
                <button onClick={handleInsert} className="action-button primary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  Insert
                </button>
              </div>
            </div>
            <pre className="response-code">
              <code>{response}</code>
            </pre>
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default PawAssistPanel;

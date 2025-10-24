const { indentString } = require('./utils');

// remove the last line if two new lines are found
const stripLastLine = (text) => {
  if (!text || !text.length) return text;

  return text.replace(/(\r?\n)$/, '');
};

// Custom indentation function for proper spacing
const indentStringCustom = (str, spaces = 4) => {
  if (!str || !str.length) {
    return str || '';
  }

  const indent = ' '.repeat(spaces);
  return str
    .split(/\r\n|\r|\n/)
    .map((line) => indent + line)
    .join('\n');
};

// Convert JSON to example BRU format with proper colon syntax
const jsonToExampleBru = (json) => {
  console.log('json', json);
  const { name, description, request, response } = json;
  const { url, params, headers, body } = request || {};
  const { headers: responseHeaders, status, statusText, body: responseBody } = response || {};

  let bru = '';

  if (name) {
    bru += `name: ${name}\n`;
  }

  if (description) {
    bru += `description: ${description}\n`;
  }

  // Request block
  bru += 'request: {\n';

  if (url) {
    bru += `  url: ${url}\n`;
  }

  if (params && params.length) {
    bru += '  params: {\n';
    bru += `${indentStringCustom(params
      .map((item) => `${item.enabled ? '' : '~'}${item.name}: ${item.value}`)
      .join('\n'), 4)}`;
    bru += '\n  }\n\n';
  }

  if (headers && headers.length) {
    bru += '  headers: {\n';
    bru += `${indentStringCustom(headers
      .map((item) => `${item.enabled ? '' : '~'}${item.name}: ${item.value}`)
      .join('\n'), 4)}`;
    bru += '\n  }\n\n';
  }

  // All body types from request side
  if (body && body.json) {
    bru += `  body:json: {\n${indentStringCustom(body.json, 4)}\n  }\n\n`;
  }

  if (body && body.text) {
    bru += `  body:text: {\n${indentStringCustom(body.text, 4)}\n  }\n\n`;
  }

  if (body && body.xml) {
    bru += `  body:xml: {\n${indentStringCustom(body.xml, 4)}\n  }\n\n`;
  }

  if (body && body.sparql) {
    bru += `  body:sparql: {\n${indentStringCustom(body.sparql, 4)}\n  }\n\n`;
  }

  if (body && body.graphql && body.graphql.query) {
    bru += `  body:graphql: {\n${indentStringCustom(body.graphql.query, 4)}\n  }\n\n`;
  }

  if (body && body.graphql && body.graphql.variables) {
    bru += `  body:graphql:vars: {\n${indentStringCustom(body.graphql.variables, 4)}\n  }\n\n`;
  }

  if (body && body.formUrlEncoded && body.formUrlEncoded.length) {
    bru += `  body:form-urlencoded: {\n`;
    const enabledValues = body.formUrlEncoded
      .filter((item) => item.enabled)
      .map((item) => `${item.name}: ${item.value}`)
      .join('\n');
    const disabledValues = body.formUrlEncoded
      .filter((item) => !item.enabled)
      .map((item) => `~${item.name}: ${item.value}`)
      .join('\n');

    if (enabledValues) {
      bru += `${indentStringCustom(enabledValues, 4)}\n`;
    }
    if (disabledValues) {
      bru += `${indentStringCustom(disabledValues, 4)}\n`;
    }
    bru += '  }\n\n';
  }

  if (body && body.multipartForm && body.multipartForm.length) {
    bru += `  body:multipart-form: {\n`;
    const multipartForms = body.multipartForm;
    if (multipartForms.length) {
      bru += `${indentStringCustom(multipartForms
        .map((item) => {
          const enabled = item.enabled ? '' : '~';
          const contentType
            = item.contentType && item.contentType !== '' ? ' @contentType(' + item.contentType + ')' : '';

          if (item.type === 'text') {
            return `${enabled}${item.name}: ${item.value}${contentType}`;
          }

          if (item.type === 'file') {
            const filepaths = Array.isArray(item.value) ? item.value : [];
            const filestr = filepaths.join('|');
            const value = `@file(${filestr})`;
            return `${enabled}${item.name}: ${value}${contentType}`;
          }
        })
        .join('\n'), 4)}\n`;
    }
    bru += '  }\n\n';
  }

  if (body && body.file && body.file.length) {
    bru += `  body:file: {\n`;
    const files = body.file;
    if (files.length) {
      bru += `${indentStringCustom(files
        .map((item) => {
          const selected = item.selected ? '' : '~';
          const contentType
            = item.contentType && item.contentType !== '' ? ' @contentType(' + item.contentType + ')' : '';
          const filePath = item.filePath || '';
          const value = `@file(${filePath})`;
          const itemName = 'file';
          return `${selected}${itemName}: ${value}${contentType}`;
        })
        .join('\n'), 4)}\n`;
    }
    bru += '  }\n\n';
  }

  if (body && body.grpc) {
    if (Array.isArray(body.grpc)) {
      body.grpc.forEach((m) => {
        const { name, content } = m;

        bru += `  body:grpc: {\n`;
        bru += `    name: ${name}\n`;

        // Convert content to JSON string if it's an object
        let jsonValue = typeof content === 'object' ? JSON.stringify(content, null, 2) : content || '{}';

        // Wrap content with triple quotes for multiline support
        bru += `    content: '''\n${indentStringCustom(jsonValue, 6)}\n    '''\n`;
        bru += '  }\n\n';
      });
    }
  }

  if (body && body.ws) {
    if (Array.isArray(body.ws)) {
      body.ws.forEach((message) => {
        const { name, content, type = '' } = message;

        bru += `  body:ws: {\n`;
        bru += `    name: ${name}\n`;
        if (type.length) {
          bru += `    type: ${type}\n`;
        }

        // Convert content to JSON string if it's an object
        let contentValue = typeof content === 'object' ? JSON.stringify(content, null, 2) : content || '{}';

        // Wrap content with triple quotes for multiline support
        bru += `    content: '''\n${indentStringCustom(contentValue, 6)}\n    '''\n`;
        bru += '  }\n\n';
      });
    }
  }

  bru += '}\n\n';

  // Response block
  if (response) {
    bru += 'response: {\n';

    // Response headers
    if (responseHeaders && responseHeaders.length) {
      bru += '  headers: {\n';
      bru += `${indentStringCustom(responseHeaders
        .map((item) => `${item.name}: ${item.value}`)
        .join('\n'), 4)}`;
      bru += '\n  }\n\n';
    }

    // Response status
    if (status) {
      bru += '  status: {\n';
      if (status !== undefined) {
        bru += `    code: ${status}\n`;
      }
      if (statusText !== undefined) {
        bru += `    text: ${statusText}\n`;
      }
      bru += '  }\n\n';
    }

    // Response body (stays as simple text)
    if (responseBody) {
      // Ensure responseBody is a string, not an object
      const bodyString = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody, null, 2);
      bru += `  body: {\n${indentStringCustom(bodyString, 4)}\n  }\n\n`;
    }

    bru += '}\n';
  }

  return stripLastLine(bru);
};

module.exports = jsonToExampleBru;

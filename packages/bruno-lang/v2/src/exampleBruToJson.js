const ohm = require('ohm-js');
const _ = require('lodash');
const { safeParseJson, outdentString } = require('./utils');

/**
 * Example Grammar for Bruno
 *
 * Examples follow a simplified grammar with root-level properties and proper colon syntax.
 * No meta block - everything is at root level: name, description, type, url, etc.
 * Supports all body types from request side but response body stays as simple text.
 */
const exampleGrammar = ohm.grammar(`Example {
  ExampleFile = (name | description | request | response)*
  
  nl = "\\r"? "\\n"
  st = " " | "\\t"
  stnl = st | nl
  tagend = nl st* "}"
  optionalnl = ~tagend nl
  keychar = ~(tagend | st | nl | ":") any
  valuechar = ~(nl | tagend) any

  // Multiline text block surrounded by '''
  multilinetextblockdelimiter = "'''"
  multilinetextblock = multilinetextblockdelimiter (~multilinetextblockdelimiter any)* multilinetextblockdelimiter

  // Dictionary Blocks
  dictionary = st* "{" pairlist? tagend
  pairlist = optionalnl* pair (~tagend nl pair)*
  pair = st* (quoted_key | key) st* ":" st* value st*
  disable_char = "~"
  quote_char = "\\""
  esc_char = "\\\\"
  esc_quote_char = esc_char quote_char
  quoted_key_char = ~(quote_char | esc_quote_char | nl) any
  quoted_key = disable_char? quote_char (esc_quote_char | quoted_key_char)* quote_char
  key = keychar*
  value = multilinetextblock | valuechar*

  // Text Blocks
  textblock = textline (~tagend nl textline)*
  textline = textchar*
  textchar = ~nl any
  
  // Body block with brace matching
  bodyblock = "{" nl* bodycontent* nl* "}"
  bodycontent = bodyblock | ~("{" | "}") any

  // Root level properties
  name = "name" st* ":" st* valuechar* st*
  description = "description" st* ":" st* valuechar* st*

  // Request block
  request = "request" st* ":" st* "{" nl* requestcontent tagend
  requestcontent = stnl* ((requesturl | requestbody | requestparamspath | requestparamsquery | requestheaders | requestbodies) (~tagend stnl)*)*
  requesturl = "url" st* ":" st* valuechar* st*
  requestbody = "body" st* ":" st* "{" nl* textblock tagend
  requestparamspath = "params:path" st* ":" st* dictionary
  requestparamsquery = "params:query" st* ":" st* dictionary
  requestheaders = "headers" st* ":" st* dictionary
  requestbodies = bodyjson | bodytext | bodyxml | bodysparql | bodygraphql | bodygraphqlvars | bodyformurlencoded | bodymultipart | bodyfile | bodygrpc | bodyws

  // All body types from request side
  bodyjson = "body:json" st* ":" st* bodyblock
  bodytext = "body:text" st* ":" st* bodyblock
  bodyxml = "body:xml" st* ":" st* bodyblock
  bodysparql = "body:sparql" st* ":" st* bodyblock
  bodygraphql = "body:graphql" st* ":" st* bodyblock
  bodygraphqlvars = "body:graphql:vars" st* ":" st* bodyblock
  bodyformurlencoded = "body:form-urlencoded" st* ":" st* dictionary
  bodymultipart = "body:multipart-form" st* ":" st* dictionary
  bodyfile = "body:file" st* ":" st* dictionary
  bodygrpc = "body:grpc" st* ":" st* "{" nl* grpccontent tagend
  bodyws = "body:ws" st* ":" st* "{" nl* wscontent tagend

  grpccontent = grpcline (~tagend nl grpcline)*
  grpcline = grpcchar*
  grpcchar = ~nl any

  wscontent = wsline (~tagend nl wsline)*
  wsline = wschar*
  wschar = ~nl any

  // Response block
  response = "response" st* ":" st* "{" nl* responsecontent tagend
  responsecontent = stnl* ((responseheaders | responsestatus | responsebody) (~tagend stnl)*)*
  responseheaders = "headers" st* ":" st* dictionary
  responsestatus = "status" st* ":" st* dictionary
  responsebody = "body" st* ":" st* bodyblock
}`);

const mapPairListToKeyValPairs = (pairList = [], parseEnabled = true) => {
  if (!pairList.length) {
    return [];
  }
  return _.map(pairList[0], (pair) => {
    let name = _.keys(pair)[0];
    let value = pair[name];

    if (!parseEnabled) {
      return {
        name,
        value
      };
    }

    let enabled = true;
    if (name && name.length && name.charAt(0) === '~') {
      name = name.slice(1);
      enabled = false;
    }

    return {
      name,
      value,
      enabled
    };
  });
};

const mapPairListToKeyValPair = (pairList = []) => {
  if (!pairList || !pairList.length) {
    return {};
  }

  return _.merge({}, ...pairList[0]);
};

const mapRequestParams = (pairList = [], type) => {
  if (!pairList.length) {
    return [];
  }
  return _.map(pairList[0], (pair) => {
    let name = _.keys(pair)[0];
    let value = pair[name];
    let enabled = true;
    if (name && name.length && name.charAt(0) === '~') {
      name = name.slice(1);
      enabled = false;
    }

    return {
      name,
      value,
      enabled,
      type
    };
  });
};

// Helper functions for multipart and file handling
const multipartExtractContentType = (pair) => {
  if (_.isString(pair.value)) {
    const match = pair.value.match(/^(.*?)\s*@contentType\((.*?)\)\s*$/);
    if (match != null && match.length > 2) {
      pair.value = match[1];
      pair.contentType = match[2];
    } else {
      pair.contentType = '';
    }
  }
};

const fileExtractContentType = (pair) => {
  if (_.isString(pair.value)) {
    const match = pair.value.match(/^(.*?)\s*@contentType\((.*?)\)\s*$/);
    if (match && match.length > 2) {
      pair.value = match[1].trim();
      pair.contentType = match[2].trim();
    } else {
      pair.contentType = '';
    }
  }
};

const mapPairListToKeyValPairsMultipart = (pairList = [], parseEnabled = true) => {
  const pairs = mapPairListToKeyValPairs(pairList, parseEnabled);

  return pairs.map((pair) => {
    pair.type = 'text';
    multipartExtractContentType(pair);

    if (pair.value.startsWith('@file(') && pair.value.endsWith(')')) {
      let filestr = pair.value.replace(/^@file\(/, '').replace(/\)$/, '');
      pair.type = 'file';
      pair.value = filestr.split('|');
    }

    return pair;
  });
};

const mapPairListToKeyValPairsFile = (pairList = [], parseEnabled = true) => {
  const pairs = mapPairListToKeyValPairs(pairList, parseEnabled);
  return pairs.map((pair) => {
    fileExtractContentType(pair);

    if (pair.value.startsWith('@file(') && pair.value.endsWith(')')) {
      let filePath = pair.value.replace(/^@file\(/, '').replace(/\)$/, '');
      pair.filePath = filePath;
      pair.selected = pair.enabled;

      // Remove pair.value as it only contains the file path reference
      delete pair.value;
      // Remove pair.name as it is auto-generated (e.g., file1, file2, file3, etc.)
      delete pair.name;
      delete pair.enabled;
    }

    return pair;
  });
};

const sem = exampleGrammar.createSemantics().addAttribute('ast', {
  ExampleFile(tags) {
    if (!tags || !tags.ast || !tags.ast.length) {
      return {};
    }

    return _.reduce(tags.ast, (result, item) => {
      return _.merge(result, item);
    }, {});
  },
  dictionary(_1, _2, pairlist, _3) {
    return pairlist.ast;
  },
  pairlist(_1, pair, _2, rest) {
    return [pair.ast, ...rest.ast];
  },
  pair(_1, key, _2, _3, _4, value, _5) {
    let res = {};
    res[key.ast] = value.ast ? value.ast.trim() : '';
    return res;
  },
  esc_quote_char(_1, quote) {
    return quote.sourceString;
  },
  quoted_key(disabled, _1, chars, _2) {
    return (disabled ? disabled.sourceString : '') + chars.ast.join('');
  },
  key(chars) {
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  value(chars) {
    try {
      let isMultiline = chars.sourceString?.startsWith('```') && chars.sourceString?.endsWith('```');
      if (isMultiline) {
        const multilineString = chars.sourceString?.replace(/^```|```$/g, '');
        return multilineString
          .split('\n')
          .map((line) => line.slice(4))
          .join('\n');
      }
      return chars.sourceString ? chars.sourceString.trim() : '';
    } catch (err) {
      console.error(err);
    }
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  textblock(line, _1, rest) {
    return [line.ast, ...rest.ast].join('\n');
  },
  textline(chars) {
    return chars.sourceString;
  },
  textchar(char) {
    return char.sourceString;
  },
  bodyblock(_1, _2, content, _3, _4) {
    // Return the inner content (without the outer braces and surrounding whitespace)
    // Use the sourceString of the entire bodyblock and extract the inner content
    const fullContent = this.sourceString;
    // Find the first { and last } to extract the inner content
    const firstBrace = fullContent.indexOf('{');
    const lastBrace = fullContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      let innerContent = fullContent.substring(firstBrace + 1, lastBrace);
      // Remove leading and trailing whitespace/newlines
      innerContent = innerContent.replace(/^\s+/, '').replace(/\s+$/, '');
      return innerContent;
    }
    return fullContent;
  },
  bodycontent(char) {
    return char.sourceString;
  },
  nl(_1, _2) {
    return '';
  },
  st(_) {
    return '';
  },
  tagend(_1, _2, _3) {
    return '';
  },
  _terminal() {
    return this.sourceString;
  },
  multilinetextblockdelimiter(_) {
    return '';
  },
  multilinetextblock(_1, content, _2) {
    return content.sourceString.trim();
  },
  _iter(...elements) {
    return elements.map((e) => e.ast);
  },

  // Root level properties
  name(_1, _2, _3, _4, value, _5) {
    return {
      name: value.sourceString ? value.sourceString.trim() : ''
    };
  },
  description(_1, _2, _3, _4, value, _5) {
    return {
      description: value.sourceString ? value.sourceString.trim() : ''
    };
  },

  // Request block
  request(_1, _2, _3, _4, _5, _6, content, _7) {
    return { request: content.ast };
  },
  requestcontent(_1, tags, _2) {
    if (!tags || !tags.ast || !tags.ast.length) {
      return {};
    }
    // Filter out empty items and merge the results
    const validItems = tags.ast.filter((item) => item && Object.keys(item).length > 0);
    return _.reduce(validItems, (result, item) => {
      return _.merge(result, item);
    }, {});
  },
  requesturl(_1, _2, _3, _4, value, _5) {
    return { url: value.sourceString ? value.sourceString.trim() : '' };
  },
  requestbody(_1, _2, _3, _4, _5, _6, textblock, _7) {
    return { body: outdentString(textblock.sourceString) };
  },
  requestparamspath(_1, _2, _3, _4, dictionary) {
    return { params: mapRequestParams(dictionary.ast, 'path') };
  },
  requestparamsquery(_1, _2, _3, _4, dictionary) {
    return { params: mapRequestParams(dictionary.ast, 'query') };
  },
  requestheaders(_1, _2, _3, _4, dictionary) {
    return { headers: mapPairListToKeyValPairs(dictionary.ast) };
  },

  // Response block
  response(_1, _2, _3, _4, _5, _6, content, _7) {
    return { response: content.ast };
  },
  responsecontent(_1, tags, _2) {
    if (!tags || !tags.ast || !tags.ast.length) {
      return {};
    }
    // Filter out empty items and merge the results
    const validItems = tags.ast.filter((item) => item && Object.keys(item).length > 0);
    return _.reduce(validItems, (result, item) => {
      return _.merge(result, item);
    }, {});
  },
  responseheaders(_1, _2, _3, _4, dictionary) {
    return { headers: mapPairListToKeyValPairs(dictionary.ast) };
  },
  responsestatus(_1, _2, _3, _4, dictionary) {
    const statusPairs = mapPairListToKeyValPairs(dictionary.ast, false);
    return {
      status: {
        code: statusPairs.find((p) => p.name === 'code')?.value || 200,
        text: statusPairs.find((p) => p.name === 'text')?.value || 'OK'
      }
    };
  },
  responsebody(_1, _2, _3, _4, bodyblock) {
    return { body: outdentString(bodyblock.ast, 4) };
  },

  // All body types from request side
  bodyjson(_1, _2, _3, _4, bodyblock) {
    return {
      body: {
        mode: 'json',
        json: outdentString(bodyblock.ast, 4)
      }
    };
  },
  bodytext(_1, _2, _3, _4, bodyblock) {
    return {
      body: {
        mode: 'text',
        text: outdentString(bodyblock.ast, 4)
      }
    };
  },
  bodyxml(_1, _2, _3, _4, bodyblock) {
    return {
      body: {
        mode: 'xml',
        xml: outdentString(bodyblock.ast, 4)
      }
    };
  },
  bodysparql(_1, _2, _3, _4, bodyblock) {
    return {
      body: {
        mode: 'sparql',
        sparql: outdentString(bodyblock.ast, 4)
      }
    };
  },
  bodygraphql(_1, _2, _3, _4, bodyblock) {
    return {
      body: {
        mode: 'graphql',
        graphql: {
          query: outdentString(bodyblock.ast, 4)
        }
      }
    };
  },
  bodygraphqlvars(_1, _2, _3, _4, bodyblock) {
    return {
      body: {
        mode: 'graphql',
        graphql: {
          variables: outdentString(bodyblock.ast, 4)
        }
      }
    };
  },
  bodyformurlencoded(_1, _2, _3, _4, dictionary) {
    return {
      body: {
        mode: 'formUrlEncoded',
        formUrlEncoded: mapPairListToKeyValPairs(dictionary.ast)
      }
    };
  },
  bodymultipart(_1, _2, _3, _4, dictionary) {
    return {
      body: {
        mode: 'multipartForm',
        multipartForm: mapPairListToKeyValPairsMultipart(dictionary.ast)
      }
    };
  },
  bodyfile(_1, _2, _3, _4, dictionary) {
    return {
      body: {
        mode: 'file',
        file: mapPairListToKeyValPairsFile(dictionary.ast)
      }
    };
  },
  bodygrpc(_1, _2, _3, _4, _5, _6, grpccontent, _7) {
    const content = grpccontent.sourceString;
    const lines = content.split('\n');

    // Parse name and content from the lines
    let messageName = '';
    let messageContent = '';
    let inContent = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('name:')) {
        messageName = trimmedLine.substring(5).trim();
      } else if (trimmedLine.startsWith('content:')) {
        inContent = true;
        const contentLine = trimmedLine.substring(8).trim();
        if (contentLine.startsWith('```')) {
          messageContent = contentLine.substring(3);
        } else {
          messageContent = contentLine;
        }
      } else if (inContent && trimmedLine.endsWith('```')) {
        messageContent += '\n' + trimmedLine.substring(0, trimmedLine.length - 3);
        break;
      } else if (inContent) {
        messageContent += '\n' + line;
      }
    }

    try {
      // Validate JSON by parsing (but don't modify the original string)
      JSON.parse(messageContent);
    } catch (error) {
      console.error('Error validating gRPC message JSON:', error);
      return {
        body: {
          mode: 'grpc',
          grpc: [{
            name: messageName,
            content: '{}'
          }]
        }
      };
    }

    return {
      body: {
        mode: 'grpc',
        grpc: [{
          name: messageName,
          content: messageContent
        }]
      }
    };
  },
  bodyws(_1, _2, _3, _4, _5, _6, wscontent, _7) {
    const content = wscontent.sourceString;
    const lines = content.split('\n');

    // Parse name, type, and content from the lines
    let messageName = '';
    let messageType = '';
    let messageContent = '';
    let inContent = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('name:')) {
        messageName = trimmedLine.substring(5).trim();
      } else if (trimmedLine.startsWith('type:')) {
        messageType = trimmedLine.substring(5).trim();
      } else if (trimmedLine.startsWith('content:')) {
        inContent = true;
        const contentLine = trimmedLine.substring(8).trim();
        if (contentLine.startsWith('```')) {
          messageContent = contentLine.substring(3);
        } else {
          messageContent = contentLine;
        }
      } else if (inContent && trimmedLine.endsWith('```')) {
        messageContent += '\n' + trimmedLine.substring(0, trimmedLine.length - 3);
        break;
      } else if (inContent) {
        messageContent += '\n' + line;
      }
    }

    return {
      body: {
        mode: 'ws',
        ws: [
          {
            name: messageName,
            type: messageType,
            content: messageContent
          }
        ]
      }
    };
  }

});

const parseExample = (input) => {
  const match = exampleGrammar.match(input);

  if (match.succeeded()) {
    let ast = sem(match).ast;
    return ast;
  } else {
    throw new Error(match.message);
  }
};

module.exports = parseExample;

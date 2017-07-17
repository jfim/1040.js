// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = typeof window === 'object';
// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function (ptr, type) {
    if (type === 'double' || type === 'i64') {
      // move so the load is aligned
      if (ptr & 7) {
        assert((ptr & 7) === 4);
        ptr += 4;
      }
    } else {
      assert((ptr & 3) === 0);
    }
    return ptr;
  },
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      assert(args.length == sig.length-1);
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      assert(sig.length == 1);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16);(assert((((STACKTOP|0) < (STACK_MAX|0))|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + (assert(DYNAMICTOP > 0),size))|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) { var success = enlargeMemory(); if (!success) { DYNAMICTOP = ret;  return 0; } }; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}



Module["Runtime"] = Runtime;



//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try {
      func = eval('_' + ident); // explicit lookup
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    assert(returnType !== 'array', 'Return type should not be "array".');
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if ((!opts || !opts.async) && typeof EmterpreterAsync === 'object') {
      assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling ccall');
    }
    if (opts && opts.async) assert(!returnType, 'async ccalls cannot return values');
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) {
      if (opts && opts.async) {
        EmterpreterAsync.asyncFinalizers.push(function() {
          Runtime.stackRestore(stack);
        });
        return;
      }
      Runtime.stackRestore(stack);
    }
    return ret;
  }

  var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }
  var JSsource = {};
  for (var fun in JSfuncs) {
    if (JSfuncs.hasOwnProperty(fun)) {
      // Elements of toCsource are arrays of three items:
      // the code, and the return value
      JSsource[fun] = parseJSFunc(JSfuncs[fun]);
    }
  }

  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=' + convertCode.returnValue + ';';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    funcstr += "if (typeof EmterpreterAsync === 'object') { assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling cwrap') }";
    if (!numericArgs) {
      // If we had a stack, restore it
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;

function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module["setValue"] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module["getValue"] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module["allocate"] = allocate;

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return Runtime.staticAlloc(size);
  if ((typeof _sbrk !== 'undefined' && !_sbrk.called) || !runtimeInitialized) return Runtime.dynamicAlloc(size);
  return _malloc(size);
}
Module["getMemory"] = getMemory;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module["Pointer_stringify"] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module["AsciiToString"] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module["stringToAscii"] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

function UTF8ArrayToString(u8Array, idx) {
  var u0, u1, u2, u3, u4, u5;

  var str = '';
  while (1) {
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    u0 = u8Array[idx++];
    if (!u0) return str;
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
    u1 = u8Array[idx++] & 63;
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
    u2 = u8Array[idx++] & 63;
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u3 = u8Array[idx++] & 63;
      if ((u0 & 0xF8) == 0xF0) {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
      } else {
        u4 = u8Array[idx++] & 63;
        if ((u0 & 0xFC) == 0xF8) {
          u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
        } else {
          u5 = u8Array[idx++] & 63;
          u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
        }
      }
    }
    if (u0 < 0x10000) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    }
  }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}
Module["UTF8ToString"] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module["stringToUTF8Array"] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}
Module["stringToUTF8"] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module["UTF16ToString"] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF16"] = stringToUTF16;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}
Module["lengthBytesUTF16"] = lengthBytesUTF16;

function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module["UTF32ToString"] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF32"] = stringToUTF32;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}
Module["lengthBytesUTF32"] = lengthBytesUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module["stackTrace"] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;

function alignMemoryPage(x) {
  if (x % 4096 > 0) {
    x += (4096 - (x % 4096));
  }
  return x;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk


function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}

function enlargeMemory() {
  abortOnCannotGrowMemory();
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec (and given that TOTAL_STACK=' + TOTAL_STACK + ')');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer;



buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);


// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module["addOnInit"] = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module["intArrayFromString"] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module["intArrayToString"] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[((buffer++)>>0)]=array[i];
  }
}
Module["writeArrayToMemory"] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module["addRunDependency"] = addRunDependency;

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module["removeRunDependency"] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;



// === Body ===

var ASM_CONSTS = [function($0) { { Module.get_word_js($0); } },
 function($0, $1, $2) { { Module.get_parameter_js($0, $1, $2); } },
 function($0, $1, $2) { { Module.get_parameters_js($0, $1, $2); } },
 function($0, $1) { { Module.showline('L' + $0, $1, ' '); } },
 function($0, $1) { { Module.shownum('L' + $0, $1, ' '); } },
 function($0, $1, $2) { { Module.showline('L' + $0, $1, Pointer_stringify($2)); } },
 function($0, $1) { { Module.showline(Pointer_stringify($0), $1, ' '); } },
 function($0, $1) { { Module.showline(' A' + $0, $1, ' '); } },
 function($0, $1, $2) { { Module.showline(' A' + $0, $1, Pointer_stringify($2)); } },
 function($0) { { Module.begin_gains_and_losses($0) } },
 function($0) { { Module.end_gains_and_losses($0) } }];

function _emscripten_asm_const_1(code, a0) {
 return ASM_CONSTS[code](a0);
}

function _emscripten_asm_const_2(code, a0, a1) {
 return ASM_CONSTS[code](a0, a1);
}

function _emscripten_asm_const_3(code, a0, a1, a2) {
 return ASM_CONSTS[code](a0, a1, a2);
}



STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 67504;
  /* global initializers */  __ATINIT__.push();
  

/* memory initializer */ allocate([], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
/* memory initializer */ allocate([128,29,194,64,0,0,0,0,64,98,226,64,0,0,0,0,224,64,246,64,0,0,0,0,48,54,7,65,0,0,0,0,152,58,25,65,0,0,0,0,40,85,25,65,0,0,0,208,136,195,0,66,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,29,210,64,0,0,0,0,64,98,242,64,0,0,0,0,224,138,2,65,0,0,0,0,208,64,12,65,0,0,0,0,152,58,25,65,0,0,0,0,24,128,28,65,0,0,0,208,136,195,0,66,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,29,194,64,0,0,0,0,64,98,226,64,0,0,0,0,224,138,242,64,0,0,0,0,208,64,252,64,0,0,0,0,152,58,9,65,0,0,0,0,24,128,12,65,0,0,0,208,136,195,0,66,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,225,201,64,0,0,0,0,0,156,232,64,0,0,0,0,96,198,255,64,0,0,0,0,128,187,9,65,0,0,0,0,152,58,25,65,0,0,0,0,160,234,26,65,0,0,0,208,136,195,0,66,0,0,0,0,0,0,0,0,154,153,153,153,153,153,185,63,51,51,51,51,51,51,195,63,0,0,0,0,0,0,208,63,236,81,184,30,133,235,209,63,31,133,235,81,184,30,213,63,102,102,102,102,102,102,214,63,242,210,77,98,16,88,217,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,154,153,153,153,153,153,185,63,51,51,51,51,51,51,195,63,0,0,0,0,0,0,208,63,236,81,184,30,133,235,209,63,31,133,235,81,184,30,213,63,102,102,102,102,102,102,214,63,242,210,77,98,16,88,217,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,154,153,153,153,153,153,185,63,51,51,51,51,51,51,195,63,0,0,0,0,0,0,208,63,236,81,184,30,133,235,209,63,31,133,235,81,184,30,213,63,102,102,102,102,102,102,214,63,242,210,77,98,16,88,217,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,154,153,153,153,153,153,185,63,51,51,51,51,51,51,195,63,0,0,0,0,0,0,208,63,236,81,184,30,133,235,209,63,31,133,235,81,184,30,213,63,102,102,102,102,102,102,214,63,242,210,77,98,16,88,217,63], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+8068);
/* memory initializer */ allocate([215,163,96,65,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,192,3,0,0,192,4,0,0,192,5,0,0,192,6,0,0,192,7,0,0,192,8,0,0,192,9,0,0,192,10,0,0,192,11,0,0,192,12,0,0,192,13,0,0,192,14,0,0,192,15,0,0,192,16,0,0,192,17,0,0,192,18,0,0,192,19,0,0,192,20,0,0,192,21,0,0,192,22,0,0,192,23,0,0,192,24,0,0,192,25,0,0,192,26,0,0,192,27,0,0,192,28,0,0,192,29,0,0,192,30,0,0,192,31,0,0,192,0,0,0,179,1,0,0,195,2,0,0,195,3,0,0,195,4,0,0,195,5,0,0,195,6,0,0,195,7,0,0,195,8,0,0,195,9,0,0,195,10,0,0,195,11,0,0,195,12,0,0,195,13,0,0,211,14,0,0,195,15,0,0,195,0,0,12,187,1,0,12,195,2,0,12,195,3,0,12,195,4,0,12,211,184,222,0,0,184,222,0,0,0,0,0,0,10,0,0,0,100,0,0,0,232,3,0,0,16,39,0,0,160,134,1,0,64,66,15,0,128,150,152,0,0,225,245,5,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,3,0,0,0,151,1,1,0,0,4,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,123,32,77,111,100,117,108,101,46,103,101,116,95,119,111,114,100,95,106,115,40,36,48,41,59,32,125,0,123,32,77,111,100,117,108,101,46,103,101,116,95,112,97,114,97,109,101,116,101,114,95,106,115,40,36,48,44,32,36,49,44,32,36,50,41,59,32,125,0,123,32,77,111,100,117,108,101,46,103,101,116,95,112,97,114,97,109,101,116,101,114,115,95,106,115,40,36,48,44,32,36,49,44,32,36,50,41,59,32,125,0,45,95,47,32,9,0,74,97,110,0,70,101,98,0,77,97,114,0,65,112,114,0,77,97,121,0,74,117,110,0,74,117,108,0,65,117,103,0,83,101,112,0,79,99,116,0,78,111,118,0,68,101,99,0,37,100,0,69,82,82,79,82,58,32,66,97,100,32,109,111,110,116,104,32,39,37,115,39,32,111,110,32,39,37,115,39,10,0,69,82,82,79,82,58,32,66,97,100,32,100,97,121,32,39,37,115,39,32,111,110,32,39,37,115,39,10,0,69,82,82,79,82,58,32,66,97,100,32,121,101,97,114,32,39,37,115,39,32,111,110,32,39,37,115,39,10,0,87,97,114,110,105,110,103,58,32,32,85,110,117,115,117,97,108,32,121,101,97,114,32,105,110,32,39,37,115,39,32,46,32,32,85,115,101,32,109,109,45,100,100,45,121,121,32,100,97,116,101,32,108,105,107,101,32,53,45,50,51,45,48,50,46,10,0,69,82,82,79,82,58,32,66,97,100,32,109,111,110,116,104,32,39,37,100,39,10,0,123,32,77,111,100,117,108,101,46,115,104,111,119,108,105,110,101,40,39,76,39,32,43,32,36,48,44,32,36,49,44,32,39,32,39,41,59,32,125,0,123,32,77,111,100,117,108,101,46,115,104,111,119,110,117,109,40,39,76,39,32,43,32,36,48,44,32,36,49,44,32,39,32,39,41,59,32,125,0,123,32,77,111,100,117,108,101,46,115,104,111,119,108,105,110,101,40,39,76,39,32,43,32,36,48,44,32,36,49,44,32,80,111,105,110,116,101,114,95,115,116,114,105,110,103,105,102,121,40,36,50,41,41,59,32,125,0,123,32,77,111,100,117,108,101,46,115,104,111,119,108,105,110,101,40,80,111,105,110,116,101,114,95,115,116,114,105,110,103,105,102,121,40,36,48,41,44,32,36,49,44,32,39,32,39,41,59,32,125,0,114,0,37,115,0,82,101,97,100,32,67,111,109,101,110,116,58,32,123,37,115,125,10,0,37,115,32,37,115,10,0,32,89,111,117,32,97,114,101,32,105,110,32,116,104,101,32,37,50,46,49,102,37,37,32,109,97,114,103,105,110,97,108,32,116,97,120,32,98,114,97,99,107,101,116,44,10,32,97,110,100,32,121,111,117,32,97,114,101,32,112,97,121,105,110,103,32,97,110,32,101,102,102,101,99,116,105,118,101,32,37,50,46,49,102,37,37,32,116,97,120,32,111,110,32,121,111,117,114,32,105,110,99,111,109,101,46,10,0,123,32,77,111,100,117,108,101,46,115,104,111,119,108,105,110,101,40,39,32,65,39,32,43,32,36,48,44,32,36,49,44,32,39,32,39,41,59,32,125,0,123,32,77,111,100,117,108,101,46,115,104,111,119,108,105,110,101,40,39,32,65,39,32,43,32,36,48,44,32,36,49,44,32,80,111,105,110,116,101,114,95,115,116,114,105,110,103,105,102,121,40,36,50,41,41,59,32,125,0,9,81,117,97,108,46,32,68,105,118,32,38,32,71,97,105,110,115,32,87,111,114,107,83,104,101,101,116,32,37,100,58,32,32,37,56,46,50,102,10,0,9,9,51,58,32,67,104,101,99,107,32,89,101,115,46,10,0,9,9,51,58,32,67,104,101,99,107,32,78,111,46,10,0,82,101,118,105,101,119,32,65,77,84,32,102,111,114,109,54,50,53,49,32,114,111,117,116,105,110,101,32,102,111,114,32,121,111,117,114,32,115,105,116,117,97,116,105,111,110,46,10,0,83,116,97,116,117,115,32,37,100,32,110,111,116,32,104,97,110,100,108,101,100,46,10,0,9,9,65,77,84,32,112,103,32,57,32,87,114,107,83,104,116,32,37,100,58,32,37,56,46,50,102,10,0,9,9,65,77,84,32,112,103,32,56,32,87,114,107,83,104,116,32,37,100,58,32,37,56,46,50,102,10,0,89,111,117,32,77,85,83,84,32,102,105,108,101,32,65,77,84,32,102,111,114,109,32,54,50,53,49,46,32,40,37,103,32,62,32,37,103,41,10,0,32,83,117,109,32,111,102,32,70,111,114,109,32,54,50,53,49,32,76,105,110,101,115,32,56,32,116,104,114,111,117,103,104,32,50,55,32,61,32,37,56,46,50,102,10,0,89,111,117,32,109,97,121,32,110,101,101,100,32,116,111,32,102,105,108,101,32,65,77,84,32,102,111,114,109,32,54,50,53,49,46,32,32,40,65,77,84,119,115,91,51,49,93,61,37,103,32,119,104,105,99,104,32,105,115,32,78,79,84,32,109,111,114,101,32,116,104,97,110,32,65,77,84,119,115,91,51,52,93,61,37,103,41,10,0,32,40,83,101,101,32,34,87,104,111,32,77,117,115,116,32,70,105,108,101,34,32,111,110,32,112,97,103,101,45,49,32,111,102,32,73,110,115,116,114,117,99,116,105,111,110,115,32,102,111,114,32,70,111,114,109,45,54,50,53,49,46,41,10,0,32,9,9,65,77,84,32,70,111,114,109,32,54,50,53,49,44,32,76,37,100,32,61,32,37,56,46,50,102,10,0,89,111,117,114,32,65,108,116,101,114,110,97,116,105,118,101,32,77,105,110,105,109,117,109,32,84,97,120,32,61,32,37,56,46,50,102,10,0,69,114,114,111,114,58,32,67,111,117,108,100,32,110,111,116,32,111,112,101,110,32,102,101,100,101,114,97,108,32,114,101,116,117,114,110,32,39,37,115,39,10,0,73,109,112,111,114,116,105,110,103,32,76,97,115,116,32,89,101,97,114,39,115,32,70,101,100,101,114,97,108,32,82,101,116,117,114,110,32,68,97,116,97,32,102,114,111,109,32,102,105,108,101,32,39,37,115,39,10,0,85,115,101,32,115,116,97,110,100,97,114,100,32,100,101,100,117,99,116,105,111,110,46,0,32,9,61,0,76,0,32,61,32,0,69,114,114,111,114,58,32,82,101,97,100,105,110,103,32,102,101,100,32,108,105,110,101,32,110,117,109,98,101,114,32,39,37,115,37,115,39,10,0,37,108,102,0,69,114,114,111,114,58,32,82,101,97,100,105,110,103,32,102,101,100,32,108,105,110,101,32,37,100,32,39,37,115,37,115,39,10,0,70,101,100,76,105,110,91,37,100,93,32,61,32,37,50,46,50,102,10,0,68,0,121,101,115,0,110,111,0,69,114,114,111,114,58,32,82,101,97,100,105,110,103,32,102,101,100,32,115,99,104,101,100,68,32,37,100,32,39,37,115,37,115,39,10,0,32,78,111,32,99,97,114,114,121,45,111,118,101,114,32,108,111,115,115,46,10,0,9,67,97,114,114,121,79,118,101,114,87,115,37,100,32,61,32,37,50,46,50,102,10,0,9,40,83,107,105,112,32,67,97,114,114,121,79,118,101,114,87,115,32,108,105,110,101,115,32,53,45,56,46,41,10,0,9,40,83,107,105,112,32,67,97,114,114,121,79,118,101,114,87,115,32,108,105,110,101,115,32,57,45,49,51,46,41,10,0,10,37,115,10,0,32,37,100,46,32,40,97,32,68,101,115,99,114,105,112,116,105,111,110,41,32,32,32,32,32,32,32,32,32,40,98,32,66,117,121,32,68,97,116,101,41,32,40,99,32,68,97,116,101,32,83,111,108,100,41,32,40,100,32,83,111,108,100,32,80,114,105,99,101,41,32,40,101,32,67,111,115,116,41,32,40,104,32,71,97,105,110,41,10,0,32,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,10,0,32,0,32,37,115,32,37,49,48,115,32,37,49,48,115,32,37,49,52,46,50,102,32,37,49,52,46,50,102,32,37,49,52,46,50,102,10,0,32,37,100,46,32,84,111,116,97,108,115,58,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,37,49,52,46,50,102,32,37,49,52,46,50,102,32,37,49,52,46,50,102,10,10,0,123,32,77,111,100,117,108,101,46,98,101,103,105,110,95,103,97,105,110,115,95,97,110,100,95,108,111,115,115,101,115,40,36,48,41,32,125,0,69,82,82,79,82,58,32,85,110,101,120,112,101,99,116,101,100,32,69,79,70,32,111,110,32,39,37,115,39,10,0,10,70,111,114,109,40,115,41,32,56,57,52,57,58,10,0,69,82,82,79,82,58,32,66,97,100,32,102,108,111,97,116,32,39,37,115,39,44,32,114,101,97,100,105,110,103,32,37,115,46,10,0,118,97,114,105,111,117,115,45,115,104,111,114,116,0,118,97,114,105,111,117,115,45,108,111,110,103,0,69,82,82,79,82,58,32,66,117,121,45,100,97,116,101,32,97,102,116,101,114,32,115,101,108,108,45,100,97,116,101,46,10,0,69,82,82,79,82,58,32,73,109,98,97,108,97,110,99,101,100,32,99,97,112,45,103,97,105,110,115,32,101,110,116,114,121,32,40,116,111,103,103,108,101,61,37,100,41,46,10,0,123,32,77,111,100,117,108,101,46,101,110,100,95,103,97,105,110,115,95,97,110,100,95,108,111,115,115,101,115,40,36,48,41,32,125,0,67,97,112,71,97,105,110,115,45,65,47,68,0,70,111,114,109,32,56,57,52,57,32,80,97,114,116,45,73,44,32,83,104,111,114,116,45,84,101,114,109,32,67,97,112,32,71,97,105,110,115,43,76,111,115,115,101,115,44,32,67,72,69,67,75,32,40,65,41,32,66,97,115,105,115,32,82,101,112,111,114,116,101,100,32,116,111,32,73,82,83,58,0,70,111,114,109,32,56,57,52,57,32,80,97,114,116,45,73,73,44,32,76,111,110,103,45,84,101,114,109,32,67,97,112,32,71,97,105,110,115,43,76,111,115,115,101,115,44,32,67,72,69,67,75,32,40,68,41,32,66,97,115,105,115,32,82,101,112,111,114,116,101,100,32,116,111,32,73,82,83,58,0,67,97,112,71,97,105,110,115,45,66,47,69,0,70,111,114,109,32,56,57,52,57,32,80,97,114,116,45,73,44,32,83,104,111,114,116,45,84,101,114,109,32,67,97,112,32,71,97,105,110,115,43,76,111,115,115,101,115,44,32,67,72,69,67,75,32,40,66,41,32,66,97,115,105,115,32,78,79,84,32,82,101,112,111,114,116,101,100,32,116,111,32,73,82,83,58,0,70,111,114,109,32,56,57,52,57,32,80,97,114,116,45,73,73,44,32,76,111,110,103,45,84,101,114,109,32,67,97,112,32,71,97,105,110,115,43,76,111,115,115,101,115,44,32,67,72,69,67,75,32,40,69,41,32,66,97,115,105,115,32,78,79,84,32,82,101,112,111,114,116,101,100,32,116,111,32,73,82,83,58,0,67,97,112,71,97,105,110,115,45,67,47,70,0,70,111,114,109,32,56,57,52,57,32,80,97,114,116,45,73,44,32,83,104,111,114,116,45,84,101,114,109,32,67,97,112,32,71,97,105,110,115,43,76,111,115,115,101,115,44,32,67,72,69,67,75,32,40,67,41,32,78,111,116,32,114,101,112,111,114,116,101,100,32,111,110,32,70,111,114,109,32,49,48,57,57,45,66,46,10,0,70,111,114,109,32,56,57,52,57,32,80,97,114,116,45,73,73,44,32,76,111,110,103,45,84,101,114,109,32,67,97,112,32,71,97,105,110,115,43,76,111,115,115,101,115,44,32,67,72,69,67,75,32,40,70,41,32,78,111,116,32,114,101,112,111,114,116,101,100,32,111,110,32,70,111,114,109,32,49,48,57,57,45,66,46,10,0,68,52,0,68,53,0,68,54,0,59,0,87,97,114,110,105,110,103,58,32,85,110,101,120,112,101,99,116,101,100,32,109,117,108,116,105,112,108,101,32,118,97,108,117,101,115,32,111,110,32,108,105,110,101,32,68,54,46,32,32,39,37,115,39,32,105,103,110,111,114,101,100,46,10,32,73,102,32,109,117,108,116,105,45,112,97,114,116,32,102,105,108,101,110,97,109,101,44,32,116,104,101,110,32,115,117,114,114,111,117,110,100,32,105,116,32,105,110,32,113,117,111,116,101,115,32,40,34,41,46,0,68,49,49,0,68,49,50,0,68,49,51,0,68,49,52,0,32,67,97,112,32,71,97,105,110,115,47,76,111,115,115,101,115,32,83,99,104,101,100,117,108,101,45,68,10,0,9,78,101,116,32,70,111,114,109,115,45,56,57,52,57,32,83,104,111,114,116,45,116,101,114,109,32,71,97,105,110,115,32,61,32,37,49,48,46,50,102,10,0,9,78,101,116,32,70,111,114,109,115,45,56,57,52,57,32,76,111,110,103,45,116,101,114,109,32,71,97,105,110,115,32,32,61,32,37,49,48,46,50,102,10,0,32,68,49,98,58,32,100,32,61,32,37,49,48,46,50,102,32,32,32,101,32,61,32,37,49,48,46,50,102,32,32,32,32,104,32,61,32,37,49,48,46,50,102,10,0,32,68,50,58,32,32,100,32,61,32,37,49,48,46,50,102,32,32,32,101,32,61,32,37,49,48,46,50,102,32,32,32,32,104,32,61,32,37,49,48,46,50,102,10,0,32,68,51,58,32,32,100,32,61,32,37,49,48,46,50,102,32,32,32,101,32,61,32,37,49,48,46,50,102,32,32,32,32,104,32,61,32,37,49,48,46,50,102,10,0,32,68,52,32,61,32,37,54,46,50,102,10,0,32,68,53,32,61,32,37,54,46,50,102,10,0,32,68,54,32,61,32,37,54,46,50,102,9,9,40,67,97,114,114,121,45,111,118,101,114,32,76,111,115,115,41,10,0,32,68,55,32,61,32,37,54,46,50,102,9,9,123,32,78,101,116,32,115,104,111,114,116,45,116,101,114,109,32,99,97,112,105,116,97,108,32,103,97,105,110,32,111,114,32,108,111,115,115,32,125,10,0,32,68,56,98,58,32,100,32,61,32,37,49,48,46,50,102,32,32,32,101,32,61,32,37,49,48,46,50,102,32,32,32,104,32,61,32,37,49,48,46,50,102,10,0,32,68,57,58,32,32,100,32,61,32,37,49,48,46,50,102,32,32,32,101,32,61,32,37,49,48,46,50,102,32,32,32,104,32,61,32,37,49,48,46,50,102,10,0,32,68,49,48,58,32,100,32,61,32,37,49,48,46,50,102,32,32,32,101,32,61,32,37,49,48,46,50,102,32,32,32,104,32,61,32,37,49,48,46,50,102,10,0,32,68,49,49,32,61,32,37,54,46,50,102,10,0,32,68,49,50,32,61,32,37,54,46,50,102,10,0,32,68,49,51,32,61,32,37,54,46,50,102,10,0,32,68,49,52,32,61,32,37,54,46,50,102,9,40,67,97,114,114,121,45,111,118,101,114,32,76,111,115,115,41,10,0,32,68,49,53,32,61,32,37,54,46,50,102,9,9,123,32,78,101,116,32,108,111,110,103,45,116,101,114,109,32,99,97,112,105,116,97,108,32,103,97,105,110,32,111,114,32,108,111,115,115,32,125,10,0,32,68,49,54,32,61,32,37,54,46,50,102,10,0,32,68,49,55,32,61,32,121,101,115,10,0,32,68,49,56,32,61,32,37,54,46,50,102,10,0,32,68,49,57,32,61,32,37,54,46,50,102,10,0,32,68,50,48,32,61,32,89,101,115,10,0,32,68,50,48,32,61,32,78,111,10,0,32,68,49,55,32,61,32,110,111,10,0,32,68,50,49,32,61,32,37,54,46,50,102,10,0,32,68,50,50,32,61,32,89,101,115,10,0,32,68,50,50,32,61,32,78,111,10,0,32,32,83,99,104,101,100,45,68,32,116,97,120,32,87,111,114,107,115,104,101,101,116,32,108,105,110,101,32,49,48,32,61,32,37,54,46,50,102,10,0,32,32,83,99,104,101,100,45,68,32,116,97,120,32,87,111,114,107,115,104,101,101,116,32,108,105,110,101,32,49,51,32,61,32,37,54,46,50,102,10,0,32,32,83,99,104,101,100,45,68,32,116,97,120,32,87,111,114,107,115,104,101,101,116,32,108,105,110,101,32,49,52,32,61,32,37,54,46,50,102,10,0,9,83,111,99,83,101,99,87,111,114,107,83,104,101,101,116,91,37,100,93,32,61,32,37,54,46,50,102,10,0,9,83,111,99,83,101,99,87,111,114,107,83,104,101,101,116,91,55,93,58,32,67,104,101,99,107,32,39,78,111,39,10,0,78,111,110,101,32,111,102,32,121,111,117,114,32,115,111,99,105,97,108,32,115,101,99,117,114,105,116,121,32,98,101,110,101,102,105,116,115,32,97,114,101,32,116,97,120,97,98,108,101,46,10,0,9,83,111,99,83,101,99,87,111,114,107,83,104,101,101,116,91,55,93,32,61,32,37,54,46,50,102,32,32,40,67,104,101,99,107,32,39,89,101,115,39,41,10,0,9,83,111,99,83,101,99,87,111,114,107,83,104,101,101,116,91,56,93,32,61,32,37,54,46,50,102,10,0,9,83,111,99,83,101,99,87,111,114,107,83,104,101,101,116,91,57,93,58,32,67,104,101,99,107,32,39,78,111,39,10,0,9,83,111,99,83,101,99,87,111,114,107,83,104,101,101,116,91,57,93,32,61,32,37,54,46,50,102,32,32,40,67,104,101,99,107,32,39,89,101,115,39,41,10,0,85,83,32,49,48,52,48,32,50,48,49,54,32,45,32,118,37,51,46,50,102,10,0,10,37,115,44,9,32,118,37,50,46,50,102,44,32,37,115,10,0,83,116,97,116,117,115,63,0,83,105,110,103,108,101,0,77,97,114,114,105,101,100,47,74,111,105,110,116,0,77,97,114,114,105,101,100,47,83,101,112,0,72,101,97,100,95,111,102,95,72,111,117,115,101,0,87,105,100,111,119,0,69,114,114,111,114,58,32,117,110,114,101,99,111,103,110,105,122,101,100,32,115,116,97,116,117,115,32,39,37,115,39,46,32,69,120,105,116,105,110,103,46,10,0,83,116,97,116,117,115,32,61,32,37,115,32,40,37,100,41,10,0,85,110,100,101,114,54,53,63,0,89,101,115,0,78,111,0,69,114,114,111,114,58,32,117,110,114,101,99,111,103,110,105,122,101,100,32,97,110,115,119,101,114,32,116,111,32,39,85,110,100,101,114,54,53,63,39,32,40,39,37,115,39,41,46,32,69,120,105,116,105,110,103,46,10,0,32,40,85,110,100,101,114,54,53,32,61,32,37,100,41,10,0,68,101,112,101,110,100,101,110,116,115,0,76,55,0,76,56,97,0,76,56,98,0,76,57,0,76,57,98,0,32,83,99,104,101,100,117,108,101,45,66,58,10,0,32,32,66,50,32,61,32,37,54,46,50,102,10,0,32,32,66,52,32,61,32,37,54,46,50,102,10,0,32,32,66,54,32,61,32,37,54,46,50,102,10,0,76,49,48,0,76,49,49,0,76,49,50,0,76,49,51,0,76,49,52,0,76,49,53,98,0,76,49,54,98,0,76,49,55,0,76,49,56,0,76,49,57,0,76,50,48,97,0,76,50,49,0,76,50,51,0,76,50,52,0,76,50,53,0,76,50,54,0,76,50,55,0,76,50,56,0,76,50,57,0,76,51,48,0,76,51,49,97,0,76,51,50,0,76,51,51,0,76,51,52,0,76,51,53,0,116,111,116,97,108,32,105,110,99,111,109,101,0,32,40,76,50,50,32,61,32,37,51,46,50,102,32,60,32,84,104,114,101,115,104,111,108,100,32,61,32,37,51,46,50,102,41,10,0,89,111,117,32,109,97,121,32,110,111,116,32,110,101,101,100,32,116,111,32,102,105,108,101,32,97,32,114,101,116,117,114,110,44,32,100,117,101,32,116,111,32,121,111,117,114,32,105,110,99,111,109,101,32,108,101,118,101,108,46,10,0,65,100,106,117,115,116,101,100,32,71,114,111,115,115,32,73,110,99,111,109,101,0,76,51,57,0,76,51,57,97,32,61,32,37,100,10,0,67,111,108,108,101,99,116,105,98,108,101,115,0,67,111,108,108,101,99,116,105,98,108,101,115,95,71,97,105,110,115,32,61,32,37,54,46,50,102,10,0,65,49,0,65,53,0,65,54,0,65,55,0,65,56,0,65,49,48,0,65,49,49,0,65,49,50,0,65,49,51,0,89,111,117,32,99,97,110,110,111,116,32,100,101,100,117,99,116,32,121,111,117,114,32,109,111,114,116,103,97,103,101,32,105,110,115,117,114,97,110,99,101,32,112,114,101,109,105,117,109,115,46,10,0,89,111,117,114,32,109,111,114,116,103,97,103,101,32,105,110,115,117,114,97,110,99,101,32,112,114,101,109,105,117,109,115,32,100,101,100,117,99,116,105,111,110,32,105,115,32,108,105,109,105,116,101,100,46,32,85,115,105,110,103,32,119,111,114,107,115,104,101,101,116,46,10,0,9,87,111,114,107,115,104,101,101,116,91,37,100,93,32,61,32,37,54,46,50,102,10,0,89,111,117,114,32,109,111,114,116,103,97,103,101,32,105,110,115,117,114,97,110,99,101,32,112,114,101,109,105,117,109,115,32,100,101,100,117,99,116,105,111,110,32,105,115,32,110,111,116,32,108,105,109,105,116,101,100,46,108,105,109,105,116,101,100,46,10,0,65,49,52,0,65,49,54,0,65,49,55,0,65,49,56,0,67,97,114,114,121,111,118,101,114,32,102,114,111,109,32,112,114,105,111,114,32,121,101,97,114,0,65,50,48,0,65,50,49,0,65,50,50,0,65,50,51,0,65,50,56,0,32,89,111,117,114,32,100,101,100,117,99,116,105,111,110,32,105,115,32,110,111,116,32,108,105,109,105,116,101,100,46,10,0,32,89,111,117,114,32,100,101,100,117,99,116,105,111,110,32,109,97,121,32,98,101,32,108,105,109,105,116,101,100,32,40,102,114,111,109,32,37,56,46,50,102,41,46,10,0,32,73,116,101,109,105,122,101,100,32,68,101,100,117,99,116,105,111,110,115,32,87,111,114,107,115,104,101,101,116,58,10,0,32,73,68,87,83,91,37,100,93,32,61,32,37,54,46,50,102,10,0,69,114,114,111,114,58,32,76,91,51,57,93,32,40,37,103,41,32,110,111,116,32,101,113,117,97,108,32,116,111,32,49,44,32,50,44,32,51,44,32,111,114,32,52,46,10,0,40,65,115,115,117,109,105,110,103,32,110,111,32,111,110,101,32,105,115,32,99,108,97,105,109,105,110,103,32,121,111,117,114,32,111,114,32,121,111,117,114,32,106,111,105,110,116,45,115,112,111,117,115,101,32,97,115,32,97,32,100,101,112,101,110,100,101,110,116,46,41,10,0,85,115,101,32,115,116,97,110,100,97,114,100,32,100,101,100,117,99,116,105,111,110,46,10,0,67,97,115,101,32,40,76,105,110,101,32,52,48,41,32,110,111,116,32,104,97,110,100,108,101,100,46,10,0,73,116,101,109,105,122,105,110,103,46,10,0,84,97,120,97,98,108,101,32,105,110,99,111,109,101,0,32,69,120,99,101,112,116,105,111,110,32,40,83,99,104,101,100,45,68,32,73,110,115,116,114,117,99,116,105,111,110,115,32,112,97,103,101,32,49,52,41,32,45,32,68,111,32,110,111,116,32,117,115,101,32,81,68,67,71,84,32,111,114,32,83,99,104,101,100,45,68,32,84,97,120,32,87,111,114,107,115,104,101,101,116,115,46,10,0,68,111,105,110,103,32,39,81,117,97,108,105,102,105,101,100,32,68,105,118,105,100,101,110,100,115,32,97,110,100,32,67,97,112,105,116,97,108,32,71,97,105,110,32,116,97,120,32,87,111,114,107,115,104,101,101,116,39,44,32,112,97,103,101,32,52,52,46,10,0,68,111,105,110,103,32,39,83,99,104,101,100,117,108,101,32,68,32,84,97,120,32,87,111,114,107,115,104,101,101,116,39,44,32,112,97,103,101,32,68,57,46,10,0,84,97,120,0,76,52,54,0,76,52,56,0,32,40,78,111,116,32,115,117,98,106,101,99,116,32,116,111,32,65,108,116,101,114,110,97,116,105,118,101,32,77,105,110,105,109,117,109,32,84,97,120,46,41,10,0,32,40,89,111,117,32,109,117,115,116,32,112,97,121,32,65,108,116,101,114,110,97,116,105,118,101,32,77,105,110,105,109,117,109,32,84,97,120,46,41,10,0,65,108,116,101,114,110,97,116,105,118,101,32,77,105,110,105,109,117,109,32,84,97,120,0,76,52,57,0,76,53,48,0,76,53,49,0,76,53,50,0,76,53,51,0,76,53,52,0,76,53,55,0,76,53,56,0,76,53,57,0,76,54,48,97,0,76,54,48,97,32,61,32,37,54,46,50,102,10,0,76,54,48,98,0,76,54,48,98,32,61,32,37,54,46,50,102,10,0,76,54,49,0,76,54,50,0,116,111,116,97,108,32,116,97,120,0,76,54,52,0,76,54,53,0,76,54,54,97,0,76,54,55,0,76,54,56,0,76,54,57,0,76,55,48,0,76,55,49,0,76,55,50,0,76,55,51,0,116,111,116,97,108,32,112,97,121,109,101,110,116,115,0,76,55,53,32,61,32,37,54,46,50,102,32,32,82,69,66,65,84,69,33,33,33,10,0,76,55,54,97,32,61,32,37,54,46,50,102,32,10,0,76,55,56,32,61,32,37,54,46,50,102,32,32,68,85,69,32,33,33,33,10,0,32,32,32,32,32,32,32,32,32,40,87,104,105,99,104,32,105,115,32,37,50,46,49,102,37,37,32,111,102,32,121,111,117,114,32,84,111,116,97,108,32,70,101,100,101,114,97,108,32,84,97,120,46,41,10,0,10,123,32,45,45,45,45,45,45,45,45,45,32,125,10,0,89,111,117,114,49,115,116,78,97,109,101,58,0,89,111,117,114,76,97,115,116,78,97,109,101,58,0,89,111,117,114,83,111,99,83,101,99,35,58,0,83,112,111,117,115,101,49,115,116,78,97,109,101,58,0,83,112,111,117,115,101,76,97,115,116,78,97,109,101,58,0,83,112,111,117,115,101,83,111,99,83,101,99,35,58,0,89,111,117,114,78,97,109,101,115,58,32,37,115,32,38,32,37,115,44,32,37,115,10,0,89,111,117,114,78,97,109,101,115,58,32,37,115,32,37,115,32,38,32,37,115,32,37,115,10,0,89,111,117,114,78,97,109,101,115,58,32,37,115,32,37,115,10,0,78,117,109,98,101,114,38,83,116,114,101,101,116,58,0,65,112,116,35,58,0,84,111,119,110,83,116,97,116,101,90,105,112,58,0,84,33,34,25,13,1,2,3,17,75,28,12,16,4,11,29,18,30,39,104,110,111,112,113,98,32,5,6,15,19,20,21,26,8,22,7,40,36,23,24,9,10,14,27,31,37,35,131,130,125,38,42,43,60,61,62,63,67,71,74,77,88,89,90,91,92,93,94,95,96,97,99,100,101,102,103,105,106,107,108,114,115,116,121,122,123,124,0,73,108,108,101,103,97,108,32,98,121,116,101,32,115,101,113,117,101,110,99,101,0,68,111,109,97,105,110,32,101,114,114,111,114,0,82,101,115,117,108,116,32,110,111,116,32,114,101,112,114,101,115,101,110,116,97,98,108,101,0,78,111,116,32,97,32,116,116,121,0,80,101,114,109,105,115,115,105,111,110,32,100,101,110,105,101,100,0,79,112,101,114,97,116,105,111,110,32,110,111,116,32,112,101,114,109,105,116,116,101,100,0,78,111,32,115,117,99,104,32,102,105,108,101,32,111,114,32,100,105,114,101,99,116,111,114,121,0,78,111,32,115,117,99,104,32,112,114,111,99,101,115,115,0,70,105,108,101,32,101,120,105,115,116,115,0,86,97,108,117,101,32,116,111,111,32,108,97,114,103,101,32,102,111,114,32,100,97,116,97,32,116,121,112,101,0,78,111,32,115,112,97,99,101,32,108,101,102,116,32,111,110,32,100,101,118,105,99,101,0,79,117,116,32,111,102,32,109,101,109,111,114,121,0,82,101,115,111,117,114,99,101,32,98,117,115,121,0,73,110,116,101,114,114,117,112,116,101,100,32,115,121,115,116,101,109,32,99,97,108,108,0,82,101,115,111,117,114,99,101,32,116,101,109,112,111,114,97,114,105,108,121,32,117,110,97,118,97,105,108,97,98,108,101,0,73,110,118,97,108,105,100,32,115,101,101,107,0,67,114,111,115,115,45,100,101,118,105,99,101,32,108,105,110,107,0,82,101,97,100,45,111,110,108,121,32,102,105,108,101,32,115,121,115,116,101,109,0,68,105,114,101,99,116,111,114,121,32,110,111,116,32,101,109,112,116,121,0,67,111,110,110,101,99,116,105,111,110,32,114,101,115,101,116,32,98,121,32,112,101,101,114,0,79,112,101,114,97,116,105,111,110,32,116,105,109,101,100,32,111,117,116,0,67,111,110,110,101,99,116,105,111,110,32,114,101,102,117,115,101,100,0,72,111,115,116,32,105,115,32,100,111,119,110,0,72,111,115,116,32,105,115,32,117,110,114,101,97,99,104,97,98,108,101,0,65,100,100,114,101,115,115,32,105,110,32,117,115,101,0,66,114,111,107,101,110,32,112,105,112,101,0,73,47,79,32,101,114,114,111,114,0,78,111,32,115,117,99,104,32,100,101,118,105,99,101,32,111,114,32,97,100,100,114,101,115,115,0,66,108,111,99,107,32,100,101,118,105,99,101,32,114,101,113,117,105,114,101,100,0,78,111,32,115,117,99,104,32,100,101,118,105,99,101,0,78,111,116,32,97,32,100,105,114,101,99,116,111,114,121,0,73,115,32,97,32,100,105,114,101,99,116,111,114,121,0,84,101,120,116,32,102,105,108,101,32,98,117,115,121,0,69,120,101,99,32,102,111,114,109,97,116,32,101,114,114,111,114,0,73,110,118,97,108,105,100,32,97,114,103,117,109,101,110,116,0,65,114,103,117,109,101,110,116,32,108,105,115,116,32,116,111,111,32,108,111,110,103,0,83,121,109,98,111,108,105,99,32,108,105,110,107,32,108,111,111,112,0,70,105,108,101,110,97,109,101,32,116,111,111,32,108,111,110,103,0,84,111,111,32,109,97,110,121,32,111,112,101,110,32,102,105,108,101,115,32,105,110,32,115,121,115,116,101,109,0,78,111,32,102,105,108,101,32,100,101,115,99,114,105,112,116,111,114,115,32,97,118,97,105,108,97,98,108,101,0,66,97,100,32,102,105,108,101,32,100,101,115,99,114,105,112,116,111,114,0,78,111,32,99,104,105,108,100,32,112,114,111,99,101,115,115,0,66,97,100,32,97,100,100,114,101,115,115,0,70,105,108,101,32,116,111,111,32,108,97,114,103,101,0,84,111,111,32,109,97,110,121,32,108,105,110,107,115,0,78,111,32,108,111,99,107,115,32,97,118,97,105,108,97,98,108,101,0,82,101,115,111,117,114,99,101,32,100,101,97,100,108,111,99,107,32,119,111,117,108,100,32,111,99,99,117,114,0,83,116,97,116,101,32,110,111,116,32,114,101,99,111,118,101,114,97,98,108,101,0,80,114,101,118,105,111,117,115,32,111,119,110,101,114,32,100,105,101,100,0,79,112,101,114,97,116,105,111,110,32,99,97,110,99,101,108,101,100,0,70,117,110,99,116,105,111,110,32,110,111,116,32,105,109,112,108,101,109,101,110,116,101,100,0,78,111,32,109,101,115,115,97,103,101,32,111,102,32,100,101,115,105,114,101,100,32,116,121,112,101,0,73,100,101,110,116,105,102,105,101,114,32,114,101,109,111,118,101,100,0,68,101,118,105,99,101,32,110,111,116,32,97,32,115,116,114,101,97,109,0,78,111,32,100,97,116,97,32,97,118,97,105,108,97,98,108,101,0,68,101,118,105,99,101,32,116,105,109,101,111,117,116,0,79,117,116,32,111,102,32,115,116,114,101,97,109,115,32,114,101,115,111,117,114,99,101,115,0,76,105,110,107,32,104,97,115,32,98,101,101,110,32,115,101,118,101,114,101,100,0,80,114,111,116,111,99,111,108,32,101,114,114,111,114,0,66,97,100,32,109,101,115,115,97,103,101,0,70,105,108,101,32,100,101,115,99,114,105,112,116,111,114,32,105,110,32,98,97,100,32,115,116,97,116,101,0,78,111,116,32,97,32,115,111,99,107,101,116,0,68,101,115,116,105,110,97,116,105,111,110,32,97,100,100,114,101,115,115,32,114,101,113,117,105,114,101,100,0,77,101,115,115,97,103,101,32,116,111,111,32,108,97,114,103,101,0,80,114,111,116,111,99,111,108,32,119,114,111,110,103,32,116,121,112,101,32,102,111,114,32,115,111,99,107,101,116,0,80,114,111,116,111,99,111,108,32,110,111,116,32,97,118,97,105,108,97,98,108,101,0,80,114,111,116,111,99,111,108,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,83,111,99,107,101,116,32,116,121,112,101,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,78,111,116,32,115,117,112,112,111,114,116,101,100,0,80,114,111,116,111,99,111,108,32,102,97,109,105,108,121,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,65,100,100,114,101,115,115,32,102,97,109,105,108,121,32,110,111,116,32,115,117,112,112,111,114,116,101,100,32,98,121,32,112,114,111,116,111,99,111,108,0,65,100,100,114,101,115,115,32,110,111,116,32,97,118,97,105,108,97,98,108,101,0,78,101,116,119,111,114,107,32,105,115,32,100,111,119,110,0,78,101,116,119,111,114,107,32,117,110,114,101,97,99,104,97,98,108,101,0,67,111,110,110,101,99,116,105,111,110,32,114,101,115,101,116,32,98,121,32,110,101,116,119,111,114,107,0,67,111,110,110,101,99,116,105,111,110,32,97,98,111,114,116,101,100,0,78,111,32,98,117,102,102,101,114,32,115,112,97,99,101,32,97,118,97,105,108,97,98,108,101,0,83,111,99,107,101,116,32,105,115,32,99,111,110,110,101,99,116,101,100,0,83,111,99,107,101,116,32,110,111,116,32,99,111,110,110,101,99,116,101,100,0,67,97,110,110,111,116,32,115,101,110,100,32,97,102,116,101,114,32,115,111,99,107,101,116,32,115,104,117,116,100,111,119,110,0,79,112,101,114,97,116,105,111,110,32,97,108,114,101,97,100,121,32,105,110,32,112,114,111,103,114,101,115,115,0,79,112,101,114,97,116,105,111,110,32,105,110,32,112,114,111,103,114,101,115,115,0,83,116,97,108,101,32,102,105,108,101,32,104,97,110,100,108,101,0,82,101,109,111,116,101,32,73,47,79,32,101,114,114,111,114,0,81,117,111,116,97,32,101,120,99,101,101,100,101,100,0,78,111,32,109,101,100,105,117,109,32,102,111,117,110,100,0,87,114,111,110,103,32,109,101,100,105,117,109,32,116,121,112,101,0,78,111,32,101,114,114,111,114,32,105,110,102,111,114,109,97,116,105,111,110,0,0,105,110,102,105,110,105,116,121,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,1,2,3,4,5,6,7,8,9,255,255,255,255,255,255,255,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,255,255,255,255,255,255,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,1,2,4,7,3,6,5,0,114,119,97], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+56656);
/* memory initializer */ allocate([17,0,10,0,17,17,17,0,0,0,0,5,0,0,0,0,0,0,9,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,15,10,17,17,17,3,10,7,0,1,19,9,11,11,0,0,9,6,11,0,0,11,0,6,17,0,0,0,17,17,17,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,10,10,17,17,17,0,10,0,0,2,0,9,11,0,0,0,9,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,4,13,0,0,0,0,9,14,0,0,0,0,0,14,0,0,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,0,0,0,0,0,0,0,0,0,0,0,15,0,0,0,0,15,0,0,0,0,9,16,0,0,0,0,0,16,0,0,16,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,0,10,0,0,0,0,9,11,0,0,0,0,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,48,49,50,51,52,53,54,55,56,57,65,66,67,68,69,70,45,43,32,32,32,48,88,48,120,0,40,110,117,108,108,41,0,45,48,88,43,48,88,32,48,88,45,48,120,43,48,120,32,48,120,0,105,110,102,0,73,78,70,0,110,97,110,0,78,65,78,0,46,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+66959);





/* no memory initializer */
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


   
  Module["_i64Subtract"] = _i64Subtract;

  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      else Module.printErr('failed to set errno from JS');
      return value;
    }
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 85: return totalMemory / PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 79:
          return 0;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

   
  Module["_memset"] = _memset;

  var _BDtoILow=true;

   
  Module["_bitshift64Shl"] = _bitshift64Shl;

  function _abort() {
      Module['abort']();
    }

  function ___lock() {}

  function ___unlock() {}

   
  Module["_i64Add"] = _i64Add;

  var _fabs=Math_abs;

  var _emscripten_asm_const_int=true;

  
  
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          stream.tty.ops.flush(stream.tty);
        },flush:function (stream) {
          stream.tty.ops.flush(stream.tty);
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              // we will read data by chunks of BUFSIZE
              var BUFSIZE = 256;
              var buf = new Buffer(BUFSIZE);
              var bytesRead = 0;
  
              var fd = process.stdin.fd;
              // Linux and Mac cannot use process.stdin.fd (which isn't set up as sync)
              var usingDevice = false;
              try {
                fd = fs.openSync('/dev/stdin', 'r');
                usingDevice = true;
              } catch (e) {}
  
              bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
  
              if (usingDevice) { fs.closeSync(fd); }
              if (bytesRead > 0) {
                result = buf.slice(0, bytesRead).toString('utf-8');
              } else {
                result = null;
              }
  
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }}};
  
  var MEMFS={ops_table:null,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap,
                msync: MEMFS.stream_ops.msync
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.buffer.byteLength which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },getFileDataAsRegularArray:function (node) {
        if (node.contents && node.contents.subarray) {
          var arr = [];
          for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
          return arr; // Returns a copy of the original data.
        }
        return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
      },getFileDataAsTypedArray:function (node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function (node, newCapacity) {
        // If we are asked to expand the size of a file that already exists, revert to using a standard JS array to store the file
        // instead of a typed array. This makes resizing the array more flexible because we can just .push() elements at the back to
        // increase the size.
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
          node.contents = MEMFS.getFileDataAsRegularArray(node);
          node.usedBytes = node.contents.length; // We might be writing to a lazy-loaded file which had overridden this property, so force-reset it.
        }
  
        if (!node.contents || node.contents.subarray) { // Keep using a typed array if creating a new storage, or if old one was a typed array as well.
          var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
          if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
          // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
          // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
          // avoid overshooting the allocation cap by a very large margin.
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) | 0);
          if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
          var oldContents = node.contents;
          node.contents = new Uint8Array(newCapacity); // Allocate new storage.
          if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
          return;
        }
        // Not using a typed array to back the file storage. Use a standard JS array instead.
        if (!node.contents && newCapacity > 0) node.contents = [];
        while (node.contents.length < newCapacity) node.contents.push(0);
      },resizeFileStorage:function (node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
          return;
        }
        if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
          var oldContents = node.contents;
          node.contents = new Uint8Array(new ArrayBuffer(newSize)); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
          return;
        }
        // Backing with a JS array.
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize;
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) { // Can we just reuse the buffer we are given?
              assert(position === 0, 'canOwn must imply no weird position inside the file');
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
  
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
          else {
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position+length);
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < stream.node.usedBytes) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        },msync:function (stream, buffer, offset, length, mmapFlags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          if (mmapFlags & 2) {
            // MAP_PRIVATE calls need not to be synced back to underlying fs
            return 0;
          }
  
          var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        if (typeof indexedDB !== 'undefined') return indexedDB;
        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          if (!fileStore.indexNames.contains('timestamp')) {
            fileStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function(e) {
            callback(this.error);
            e.preventDefault();
          };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
          // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
          node.contents = MEMFS.getFileDataAsTypedArray(node);
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.chmod(path, entry.mode);
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function(e) {
          done(this.error);
          e.preventDefault();
        };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        flags &= ~0100000 /*O_LARGEFILE*/; // Ignore this flag from musl, otherwise node.js fails to open the file.
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            path = fs.readlinkSync(path);
            path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
            return path;
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          if (length === 0) return 0; // node errors on 0 length reads
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          return position;
        }}};
  
  var WORKERFS={DIR_MODE:16895,FILE_MODE:33279,reader:null,mount:function (mount) {
        assert(ENVIRONMENT_IS_WORKER);
        if (!WORKERFS.reader) WORKERFS.reader = new FileReaderSync();
        var root = WORKERFS.createNode(null, '/', WORKERFS.DIR_MODE, 0);
        var createdParents = {};
        function ensureParent(path) {
          // return the parent node, creating subdirs as necessary
          var parts = path.split('/');
          var parent = root;
          for (var i = 0; i < parts.length-1; i++) {
            var curr = parts.slice(0, i+1).join('/');
            if (!createdParents[curr]) {
              createdParents[curr] = WORKERFS.createNode(parent, curr, WORKERFS.DIR_MODE, 0);
            }
            parent = createdParents[curr];
          }
          return parent;
        }
        function base(path) {
          var parts = path.split('/');
          return parts[parts.length-1];
        }
        // We also accept FileList here, by using Array.prototype
        Array.prototype.forEach.call(mount.opts["files"] || [], function(file) {
          WORKERFS.createNode(ensureParent(file.name), base(file.name), WORKERFS.FILE_MODE, 0, file, file.lastModifiedDate);
        });
        (mount.opts["blobs"] || []).forEach(function(obj) {
          WORKERFS.createNode(ensureParent(obj["name"]), base(obj["name"]), WORKERFS.FILE_MODE, 0, obj["data"]);
        });
        (mount.opts["packages"] || []).forEach(function(pack) {
          pack['metadata'].files.forEach(function(file) {
            var name = file.filename.substr(1); // remove initial slash
            WORKERFS.createNode(ensureParent(name), base(name), WORKERFS.FILE_MODE, 0, pack['blob'].slice(file.start, file.end));
          });
        });
        return root;
      },createNode:function (parent, name, mode, dev, contents, mtime) {
        var node = FS.createNode(parent, name, mode);
        node.mode = mode;
        node.node_ops = WORKERFS.node_ops;
        node.stream_ops = WORKERFS.stream_ops;
        node.timestamp = (mtime || new Date).getTime();
        assert(WORKERFS.FILE_MODE !== WORKERFS.DIR_MODE);
        if (mode === WORKERFS.FILE_MODE) {
          node.size = contents.size;
          node.contents = contents;
        } else {
          node.size = 4096;
          node.contents = {};
        }
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },node_ops:{getattr:function (node) {
          return {
            dev: 1,
            ino: undefined,
            mode: node.mode,
            nlink: 1,
            uid: 0,
            gid: 0,
            rdev: undefined,
            size: node.size,
            atime: new Date(node.timestamp),
            mtime: new Date(node.timestamp),
            ctime: new Date(node.timestamp),
            blksize: 4096,
            blocks: Math.ceil(node.size / 4096),
          };
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
        },lookup:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        },mknod:function (parent, name, mode, dev) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },rename:function (oldNode, newDir, newName) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },unlink:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },rmdir:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },readdir:function (node) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },symlink:function (parent, newName, oldPath) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },readlink:function (node) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          if (position >= stream.node.size) return 0;
          var chunk = stream.node.contents.slice(position, position + length);
          var ab = WORKERFS.reader.readAsArrayBuffer(chunk);
          buffer.set(new Uint8Array(ab), offset);
          return chunk.size;
        },write:function (stream, buffer, offset, length, position) {
          throw new FS.ErrnoError(ERRNO_CODES.EIO);
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.size;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},filesystems:null,handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
  
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); }
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); }
            }
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        var err = FS.nodePermissions(dir, 'x');
        if (err) return err;
        if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
        return 0;
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        try {
          if (FS.trackingDelegate['willMovePath']) {
            FS.trackingDelegate['willMovePath'](old_path, new_path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
        try {
          if (FS.trackingDelegate['onMovePath']) FS.trackingDelegate['onMovePath'](old_path, new_path);
        } catch(e) {
          console.log("FS.trackingDelegate['onMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return PATH.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var err = FS.mayOpen(node, flags);
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        try {
          if (FS.trackingDelegate['onOpenFile']) {
            var trackingFlags = 0;
            if ((flags & 2097155) !== 1) {
              trackingFlags |= FS.tracking.openFlags.READ;
            }
            if ((flags & 2097155) !== 0) {
              trackingFlags |= FS.tracking.openFlags.WRITE;
            }
            FS.trackingDelegate['onOpenFile'](path, trackingFlags);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['onOpenFile']('"+path+"', flags) threw an exception: " + e.message);
        }
        return stream;
      },close:function (stream) {
        if (stream.getdents) stream.getdents = null; // free readdir state
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
          if (stream.path && FS.trackingDelegate['onWriteToFile']) FS.trackingDelegate['onWriteToFile'](stream.path);
        } catch(e) {
          console.log("FS.trackingDelegate['onWriteToFile']('"+path+"') threw an exception: " + e.message);
        }
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },msync:function (stream, buffer, offset, length, mmapFlags) {
        if (!stream || !stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },munmap:function (stream) {
        return 0;
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = UTF8ArrayToString(buf, 0);
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var buf = new Uint8Array(lengthBytesUTF8(data)+1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function(stream, buffer, offset, length, pos) { return length; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device;
        if (typeof crypto !== 'undefined') {
          // for modern web browsers
          var randomBuffer = new Uint8Array(1);
          random_device = function() { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
        } else if (ENVIRONMENT_IS_NODE) {
          // for nodejs
          random_device = function() { return require('crypto').randomBytes(1)[0]; };
        } else {
          // default for ES5 platforms
          random_device = function() { return (Math.random()*256)|0; };
        }
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createSpecialDirectories:function () {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount: function() {
            var node = FS.createNode('/proc/self', 'fd', 16384 | 0777, 73);
            node.node_ops = {
              lookup: function(parent, name) {
                var fd = +name;
                var stream = FS.getStream(fd);
                if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: function() { return stream.path } }
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
          //Module.printErr(stackTrace()); // useful for debugging
          this.node = node;
          this.setErrno = function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
          if (this.stack) this.stack = demangleAll(this.stack);
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
          'IDBFS': IDBFS,
          'NODEFS': NODEFS,
          'WORKERFS': WORKERFS,
        };
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        var fflush = Module['_fflush'];
        if (fflush) fflush(0);
        // close all of our streams
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = this;
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperty(node, "usedBytes", {
            get: function() { return this.contents.length; }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency('cp ' + fullname); // might have several active requests for the same fullname
        function processData(byteArray) {
          function finish(byteArray) {
            if (preFinish) preFinish();
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency(dep);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency(dep);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency(dep);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        console.error('emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.');
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      } else if (mode == 2 /*EM_TIMING_SETIMMEDIATE*/) {
        if (!window['setImmediate']) {
          // Emulate setImmediate. (note: not a complete polyfill, we don't emulate clearImmediate() to keep code size to minimum, since not needed)
          var setImmediates = [];
          var emscriptenMainLoopMessageId = '__emcc';
          function Browser_setImmediate_messageHandler(event) {
            if (event.source === window && event.data === emscriptenMainLoopMessageId) {
              event.stopPropagation();
              setImmediates.shift()();
            }
          }
          window.addEventListener("message", Browser_setImmediate_messageHandler, true);
          window['setImmediate'] = function Browser_emulated_setImmediate(func) {
            setImmediates.push(func);
            window.postMessage(emscriptenMainLoopMessageId, "*");
          }
        }
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
          window['setImmediate'](Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'immediate';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (!noSetTiming) {
        if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
        else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
        Browser.mainLoop.scheduler();
      }
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true /* do not set timing and call scheduler, we will do it on the next lines */);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
          Browser.mainLoop.scheduler();
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          assert(typeof url == 'string', 'createObjectURL must return a url as a string');
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            assert(typeof url == 'string', 'createObjectURL must return a url as a string');
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas, vrDevice) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        Browser.vrDevice = vrDevice;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
        if (typeof Browser.vrDevice === 'undefined') Browser.vrDevice = null;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
  
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
  
        if (vrDevice) {
          canvasContainer.requestFullScreen({ vrDisplay: vrDevice });
        } else {
          canvasContainer.requestFullScreen();
        }
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },allowAsyncCallbacks:true,queuedAsyncCallbacks:[],pauseAsyncCallbacks:function () {
        Browser.allowAsyncCallbacks = false;
      },resumeAsyncCallbacks:function () { // marks future callbacks as ok to execute, and synchronously runs any remaining ones right now
        Browser.allowAsyncCallbacks = true;
        if (Browser.queuedAsyncCallbacks.length > 0) {
          var callbacks = Browser.queuedAsyncCallbacks;
          Browser.queuedAsyncCallbacks = [];
          callbacks.forEach(function(func) {
            func();
          });
        }
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } // drop it on the floor otherwise, next interval will kick in
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
          // If this assert lands, it's likely because the browser doesn't support scrollX or pageXOffset
          // and we have no viable fallback.
          assert((typeof scrollX !== 'undefined') && (typeof scrollY !== 'undefined'), 'Unable to retrieve scroll position, mouse positions likely broken.');
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              var last = Browser.touches[touch.identifier];
              if (!last) last = coords;
              Browser.lastTouches[touch.identifier] = last;
              Browser.touches[touch.identifier] = coords;
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      Module['exit'](status);
    }function _exit(status) {
      __exit(status);
    }

  
  var SYSCALLS={DEFAULT_POLLMASK:5,mappings:{},umask:511,calculateAt:function (dirfd, path) {
        if (path[0] !== '/') {
          // relative path
          var dir;
          if (dirfd === -100) {
            dir = FS.cwd();
          } else {
            var dirstream = FS.getStream(dirfd);
            if (!dirstream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
            dir = dirstream.path;
          }
          path = PATH.join2(dir, path);
        }
        return path;
      },doStat:function (func, path, buf) {
        try {
          var stat = func(path);
        } catch (e) {
          if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
            // an error occurred while trying to look up the path; we should just report ENOTDIR
            return -ERRNO_CODES.ENOTDIR;
          }
          throw e;
        }
        HEAP32[((buf)>>2)]=stat.dev;
        HEAP32[(((buf)+(4))>>2)]=0;
        HEAP32[(((buf)+(8))>>2)]=stat.ino;
        HEAP32[(((buf)+(12))>>2)]=stat.mode;
        HEAP32[(((buf)+(16))>>2)]=stat.nlink;
        HEAP32[(((buf)+(20))>>2)]=stat.uid;
        HEAP32[(((buf)+(24))>>2)]=stat.gid;
        HEAP32[(((buf)+(28))>>2)]=stat.rdev;
        HEAP32[(((buf)+(32))>>2)]=0;
        HEAP32[(((buf)+(36))>>2)]=stat.size;
        HEAP32[(((buf)+(40))>>2)]=4096;
        HEAP32[(((buf)+(44))>>2)]=stat.blocks;
        HEAP32[(((buf)+(48))>>2)]=(stat.atime.getTime() / 1000)|0;
        HEAP32[(((buf)+(52))>>2)]=0;
        HEAP32[(((buf)+(56))>>2)]=(stat.mtime.getTime() / 1000)|0;
        HEAP32[(((buf)+(60))>>2)]=0;
        HEAP32[(((buf)+(64))>>2)]=(stat.ctime.getTime() / 1000)|0;
        HEAP32[(((buf)+(68))>>2)]=0;
        HEAP32[(((buf)+(72))>>2)]=stat.ino;
        return 0;
      },doMsync:function (addr, stream, len, flags) {
        var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
        FS.msync(stream, buffer, 0, len, flags);
      },doMkdir:function (path, mode) {
        // remove a trailing slash, if one - /a/b/ has basename of '', but
        // we want to create b in the context of this function
        path = PATH.normalize(path);
        if (path[path.length-1] === '/') path = path.substr(0, path.length-1);
        FS.mkdir(path, mode, 0);
        return 0;
      },doMknod:function (path, mode, dev) {
        // we don't want this in the JS API as it uses mknod to create all nodes.
        switch (mode & 61440) {
          case 32768:
          case 8192:
          case 24576:
          case 4096:
          case 49152:
            break;
          default: return -ERRNO_CODES.EINVAL;
        }
        FS.mknod(path, mode, dev);
        return 0;
      },doReadlink:function (path, buf, bufsize) {
        if (bufsize <= 0) return -ERRNO_CODES.EINVAL;
        var ret = FS.readlink(path);
        ret = ret.slice(0, Math.max(0, bufsize));
        writeStringToMemory(ret, buf, true);
        return ret.length;
      },doAccess:function (path, amode) {
        if (amode & ~7) {
          // need a valid mode
          return -ERRNO_CODES.EINVAL;
        }
        var node;
        var lookup = FS.lookupPath(path, { follow: true });
        node = lookup.node;
        var perms = '';
        if (amode & 4) perms += 'r';
        if (amode & 2) perms += 'w';
        if (amode & 1) perms += 'x';
        if (perms /* otherwise, they've just passed F_OK */ && FS.nodePermissions(node, perms)) {
          return -ERRNO_CODES.EACCES;
        }
        return 0;
      },doDup:function (path, flags, suggestFD) {
        var suggest = FS.getStream(suggestFD);
        if (suggest) FS.close(suggest);
        return FS.open(path, flags, 0, suggestFD, suggestFD).fd;
      },doReadv:function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(((iov)+(i*8))>>2)];
          var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
          var curr = FS.read(stream, HEAP8,ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
          if (curr < len) break; // nothing more to read
        }
        return ret;
      },doWritev:function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(((iov)+(i*8))>>2)];
          var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
          var curr = FS.write(stream, HEAP8,ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
        }
        return ret;
      },varargs:0,get:function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function () {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret;
      },getStreamFromFD:function () {
        var stream = FS.getStream(SYSCALLS.get());
        if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return stream;
      },getSocketFromFD:function () {
        var socket = SOCKFS.getSocket(SYSCALLS.get());
        if (!socket) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return socket;
      },getSocketAddress:function (allowNull) {
        var addrp = SYSCALLS.get(), addrlen = SYSCALLS.get();
        if (allowNull && addrp === 0) return null;
        var info = __read_sockaddr(addrp, addrlen);
        if (info.errno) throw new FS.ErrnoError(info.errno);
        info.addr = DNS.lookup_addr(info.addr) || info.addr;
        return info;
      },get64:function () {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function () {
        assert(SYSCALLS.get() === 0);
      }};function ___syscall54(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // ioctl
      var stream = SYSCALLS.getStreamFromFD(), op = SYSCALLS.get();
      switch (op) {
        case 21505: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return 0;
        }
        case 21506: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21519: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          var argp = SYSCALLS.get();
          HEAP32[((argp)>>2)]=0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return -ERRNO_CODES.EINVAL; // not supported
        }
        case 21531: {
          var argp = SYSCALLS.get();
          return FS.ioctl(stream, op, argp);
        }
        default: abort('bad ioctl syscall ' + op);
      }
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

   
  Module["_bitshift64Lshr"] = _bitshift64Lshr;

  var _BDtoIHigh=true;

  function _pthread_cleanup_push(routine, arg) {
      __ATEXIT__.push(function() { Runtime.dynCall('vi', routine, [arg]) })
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

  function _pthread_cleanup_pop() {
      assert(_pthread_cleanup_push.level == __ATEXIT__.length, 'cannot pop if something else added meanwhile!');
      __ATEXIT__.pop();
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

  function ___syscall5(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // open
      var pathname = SYSCALLS.getStr(), flags = SYSCALLS.get(), mode = SYSCALLS.get() // optional TODO
      var stream = FS.open(pathname, flags, mode);
      return stream.fd;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  function ___syscall6(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // close
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
  var ___tm_current=allocate(44, "i8", ALLOC_STATIC);
  
  
  
  var ___tm_timezone=allocate(intArrayFromString("GMT"), "i8", ALLOC_STATIC);
  
  
  var _tzname=allocate(8, "i32*", ALLOC_STATIC);
  
  var _daylight=allocate(1, "i32*", ALLOC_STATIC);
  
  var _timezone=allocate(1, "i32*", ALLOC_STATIC);function _tzset() {
      // TODO: Use (malleable) environment variables instead of system settings.
      if (_tzset.called) return;
      _tzset.called = true;
  
      HEAP32[((_timezone)>>2)]=-(new Date()).getTimezoneOffset() * 60;
  
      var winter = new Date(2000, 0, 1);
      var summer = new Date(2000, 6, 1);
      HEAP32[((_daylight)>>2)]=Number(winter.getTimezoneOffset() != summer.getTimezoneOffset());
  
      function extractZone(date) {
        var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
        return match ? match[1] : "GMT";
      };
      var winterName = extractZone(winter);
      var summerName = extractZone(summer);
      var winterNamePtr = allocate(intArrayFromString(winterName), 'i8', ALLOC_NORMAL);
      var summerNamePtr = allocate(intArrayFromString(summerName), 'i8', ALLOC_NORMAL);
      if (summer.getTimezoneOffset() < winter.getTimezoneOffset()) {
        // Northern hemisphere
        HEAP32[((_tzname)>>2)]=winterNamePtr;
        HEAP32[(((_tzname)+(4))>>2)]=summerNamePtr;
      } else {
        HEAP32[((_tzname)>>2)]=summerNamePtr;
        HEAP32[(((_tzname)+(4))>>2)]=winterNamePtr;
      }
    }function _localtime_r(time, tmPtr) {
      _tzset();
      var date = new Date(HEAP32[((time)>>2)]*1000);
      HEAP32[((tmPtr)>>2)]=date.getSeconds();
      HEAP32[(((tmPtr)+(4))>>2)]=date.getMinutes();
      HEAP32[(((tmPtr)+(8))>>2)]=date.getHours();
      HEAP32[(((tmPtr)+(12))>>2)]=date.getDate();
      HEAP32[(((tmPtr)+(16))>>2)]=date.getMonth();
      HEAP32[(((tmPtr)+(20))>>2)]=date.getFullYear()-1900;
      HEAP32[(((tmPtr)+(24))>>2)]=date.getDay();
  
      var start = new Date(date.getFullYear(), 0, 1);
      var yday = ((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))|0;
      HEAP32[(((tmPtr)+(28))>>2)]=yday;
      HEAP32[(((tmPtr)+(36))>>2)]=-(date.getTimezoneOffset() * 60);
  
      // DST is in December in South
      var summerOffset = new Date(2000, 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dst = (date.getTimezoneOffset() == Math.min(winterOffset, summerOffset))|0;
      HEAP32[(((tmPtr)+(32))>>2)]=dst;
  
      var zonePtr = HEAP32[(((_tzname)+(dst ? Runtime.QUANTUM_SIZE : 0))>>2)];
      HEAP32[(((tmPtr)+(40))>>2)]=zonePtr;
  
      return tmPtr;
    }
  
  
  var ___tm_formatted=allocate(44, "i8", ALLOC_STATIC);
  
  function _mktime(tmPtr) {
      _tzset();
      var date = new Date(HEAP32[(((tmPtr)+(20))>>2)] + 1900,
                          HEAP32[(((tmPtr)+(16))>>2)],
                          HEAP32[(((tmPtr)+(12))>>2)],
                          HEAP32[(((tmPtr)+(8))>>2)],
                          HEAP32[(((tmPtr)+(4))>>2)],
                          HEAP32[((tmPtr)>>2)],
                          0);
  
      // There's an ambiguous hour when the time goes back; the tm_isdst field is
      // used to disambiguate it.  Date() basically guesses, so we fix it up if it
      // guessed wrong, or fill in tm_isdst with the guess if it's -1.
      var dst = HEAP32[(((tmPtr)+(32))>>2)];
      var guessedOffset = date.getTimezoneOffset();
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(2000, 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dstOffset = Math.min(winterOffset, summerOffset); // DST is in December in South
      if (dst < 0) {
        HEAP32[(((tmPtr)+(32))>>2)]=Number(winterOffset != guessedOffset);
      } else if ((dst > 0) != (winterOffset != guessedOffset)) {
        var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
        var trueOffset = dst > 0 ? summerOffset : winterOffset;
        // Don't try setMinutes(date.getMinutes() + ...) -- it's messed up.
        date.setTime(date.getTime() + (trueOffset - guessedOffset)*60000);
      }
  
      HEAP32[(((tmPtr)+(24))>>2)]=date.getDay();
      var yday = ((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))|0;
      HEAP32[(((tmPtr)+(28))>>2)]=yday;
  
      return (date.getTime() / 1000)|0;
    }function _asctime_r(tmPtr, buf) {
      var date = {
        tm_sec: HEAP32[((tmPtr)>>2)],
        tm_min: HEAP32[(((tmPtr)+(4))>>2)],
        tm_hour: HEAP32[(((tmPtr)+(8))>>2)],
        tm_mday: HEAP32[(((tmPtr)+(12))>>2)],
        tm_mon: HEAP32[(((tmPtr)+(16))>>2)],
        tm_year: HEAP32[(((tmPtr)+(20))>>2)],
        tm_wday: HEAP32[(((tmPtr)+(24))>>2)]
      };
      var days = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ];
      var months = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
      var s = days[date.tm_wday] + ' ' + months[date.tm_mon] +
          (date.tm_mday < 10 ? '  ' : ' ') + date.tm_mday +
          (date.tm_hour < 10 ? ' 0' : ' ') + date.tm_hour +
          (date.tm_min < 10 ? ':0' : ':') + date.tm_min +
          (date.tm_sec < 10 ? ':0' : ':') + date.tm_sec +
          ' ' + (1900 + date.tm_year) + "\n";
      writeStringToMemory(s, buf);
      return buf;
    }function _ctime_r(time, buf) {
      var stack = Runtime.stackSave();
      var rv = _asctime_r(_localtime_r(time, Runtime.stackAlloc(44)), buf);
      Runtime.stackRestore(stack);
      return rv;
    }function _ctime(timer) {
      return _ctime_r(timer, ___tm_current);
    }

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) {
        var success = self.alloc(bytes);
        if (!success) return -1 >>> 0; // sbrk failure code
      }
      return ret;  // Previous break location.
    }

  var _BItoD=true;

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  function _pthread_self() {
      //FIXME: assumes only a single thread
      return 0;
    }

  function ___syscall140(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // llseek
      var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
      var offset = offset_low;
      assert(offset_high === 0);
      FS.llseek(stream, offset, whence);
      HEAP32[((result)>>2)]=stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall146(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // writev
      var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      return SYSCALLS.doWritev(stream, iov, iovcnt);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall221(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // fcntl64
      var stream = SYSCALLS.getStreamFromFD(), cmd = SYSCALLS.get();
      switch (cmd) {
        case 0: {
          var arg = SYSCALLS.get();
          if (arg < 0) {
            return -ERRNO_CODES.EINVAL;
          }
          var newStream;
          newStream = FS.open(stream.path, stream.flags, 0, arg);
          return newStream.fd;
        }
        case 1:
        case 2:
          return 0;  // FD_CLOEXEC makes no sense for a single process.
        case 3:
          return stream.flags;
        case 4: {
          var arg = SYSCALLS.get();
          stream.flags |= arg;
          return 0;
        }
        case 12:
        case 12: {
          var arg = SYSCALLS.get();
          var offset = 0;
          // We're always unlocked.
          HEAP16[(((arg)+(offset))>>1)]=2;
          return 0;
        }
        case 13:
        case 14:
        case 13:
        case 14:
          return 0; // Pretend that the locking is successful.
        case 16:
        case 8:
          return -ERRNO_CODES.EINVAL; // These are for sockets. We don't have them fully implemented yet.
        case 9:
          // musl trusts getown return values, due to a bug where they must be, as they overlap with errors. just return -1 here, so fnctl() returns that, and we set errno ourselves.
          ___setErrNo(ERRNO_CODES.EINVAL);
          return -1;
        default: {
          return -ERRNO_CODES.EINVAL;
        }
      }
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall145(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // readv
      var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      return SYSCALLS.doReadv(stream, iov, iovcnt);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) { Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
  Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) { return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes) }
FS.staticInit();__ATINIT__.unshift(function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() });__ATMAIN__.push(function() { FS.ignorePermissions = false });__ATEXIT__.push(function() { FS.quit() });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;Module["FS_unlink"] = FS.unlink;
__ATINIT__.unshift(function() { TTY.init() });__ATEXIT__.push(function() { TTY.shutdown() });
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); var NODEJS_PATH = require("path"); NODEFS.staticInit(); }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);


function nullFunc_ii(x) { Module["printErr"]("Invalid function pointer called with signature 'ii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_vi(x) { Module["printErr"]("Invalid function pointer called with signature 'vi'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity };

Module.asmLibraryArg = { "abort": abort, "assert": assert, "nullFunc_ii": nullFunc_ii, "nullFunc_iiii": nullFunc_iiii, "nullFunc_vi": nullFunc_vi, "invoke_ii": invoke_ii, "invoke_iiii": invoke_iiii, "invoke_vi": invoke_vi, "_fabs": _fabs, "_pthread_cleanup_pop": _pthread_cleanup_pop, "_ctime": _ctime, "___setErrNo": ___setErrNo, "_localtime_r": _localtime_r, "_tzset": _tzset, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "_sbrk": _sbrk, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_sysconf": _sysconf, "_mktime": _mktime, "___syscall6": ___syscall6, "___syscall221": ___syscall221, "_pthread_self": _pthread_self, "_asctime_r": _asctime_r, "___syscall54": ___syscall54, "___unlock": ___unlock, "_emscripten_set_main_loop": _emscripten_set_main_loop, "___syscall5": ___syscall5, "__exit": __exit, "___lock": ___lock, "_abort": _abort, "_pthread_cleanup_push": _pthread_cleanup_push, "___syscall145": ___syscall145, "_time": _time, "___syscall146": ___syscall146, "_ctime_r": _ctime_r, "___syscall140": ___syscall140, "_exit": _exit, "_emscripten_asm_const_3": _emscripten_asm_const_3, "_emscripten_asm_const_2": _emscripten_asm_const_2, "_emscripten_asm_const_1": _emscripten_asm_const_1, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8 };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'almost asm';
  
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var cttz_i8=env.cttz_i8|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var nullFunc_ii=env.nullFunc_ii;
  var nullFunc_iiii=env.nullFunc_iiii;
  var nullFunc_vi=env.nullFunc_vi;
  var invoke_ii=env.invoke_ii;
  var invoke_iiii=env.invoke_iiii;
  var invoke_vi=env.invoke_vi;
  var _fabs=env._fabs;
  var _pthread_cleanup_pop=env._pthread_cleanup_pop;
  var _ctime=env._ctime;
  var ___setErrNo=env.___setErrNo;
  var _localtime_r=env._localtime_r;
  var _tzset=env._tzset;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var _sbrk=env._sbrk;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _sysconf=env._sysconf;
  var _mktime=env._mktime;
  var ___syscall6=env.___syscall6;
  var ___syscall221=env.___syscall221;
  var _pthread_self=env._pthread_self;
  var _asctime_r=env._asctime_r;
  var ___syscall54=env.___syscall54;
  var ___unlock=env.___unlock;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var ___syscall5=env.___syscall5;
  var __exit=env.__exit;
  var ___lock=env.___lock;
  var _abort=env._abort;
  var _pthread_cleanup_push=env._pthread_cleanup_push;
  var ___syscall145=env.___syscall145;
  var _time=env._time;
  var ___syscall146=env.___syscall146;
  var _ctime_r=env._ctime_r;
  var ___syscall140=env.___syscall140;
  var _exit=env._exit;
  var _emscripten_asm_const_3=env._emscripten_asm_const_3;
  var _emscripten_asm_const_2=env._emscripten_asm_const_2;
  var _emscripten_asm_const_1=env._emscripten_asm_const_1;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
  STACKTOP = (STACKTOP + 15)&-16;
if ((STACKTOP|0) >= (STACK_MAX|0)) abort();

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}
function establishStackSpace(stackBase, stackMax) {
  stackBase = stackBase|0;
  stackMax = stackMax|0;
  STACKTOP = stackBase;
  STACK_MAX = stackMax;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}

function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _get_word($infile,$word) {
 $infile = $infile|0;
 $word = $word|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $infile;
 $1 = $word;
 $2 = $1;
 $3 = _emscripten_asm_const_1(0, ($2|0))|0;
 STACKTOP = sp;return;
}
function _mystrcasestr($haystack,$needle) {
 $haystack = $haystack|0;
 $needle = $needle|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $hs = 0;
 var $j = 0, $ndl = 0, $pt = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $haystack;
 $1 = $needle;
 $j = 0;
 $2 = $0;
 $3 = (___strdup($2)|0);
 $hs = $3;
 while(1) {
  $4 = $j;
  $5 = $hs;
  $6 = (($5) + ($4)|0);
  $7 = HEAP8[$6>>0]|0;
  $8 = $7 << 24 >> 24;
  $9 = ($8|0)!=(0);
  if (!($9)) {
   break;
  }
  $10 = $j;
  $11 = $hs;
  $12 = (($11) + ($10)|0);
  $13 = HEAP8[$12>>0]|0;
  $14 = $13 << 24 >> 24;
  $15 = (_toupper($14)|0);
  $16 = $15&255;
  $17 = $j;
  $18 = $hs;
  $19 = (($18) + ($17)|0);
  HEAP8[$19>>0] = $16;
  $20 = $j;
  $21 = (($20) + 1)|0;
  $j = $21;
 }
 $22 = $1;
 $23 = (___strdup($22)|0);
 $ndl = $23;
 $j = 0;
 while(1) {
  $24 = $j;
  $25 = $ndl;
  $26 = (($25) + ($24)|0);
  $27 = HEAP8[$26>>0]|0;
  $28 = $27 << 24 >> 24;
  $29 = ($28|0)!=(0);
  if (!($29)) {
   break;
  }
  $30 = $j;
  $31 = $ndl;
  $32 = (($31) + ($30)|0);
  $33 = HEAP8[$32>>0]|0;
  $34 = $33 << 24 >> 24;
  $35 = (_toupper($34)|0);
  $36 = $35&255;
  $37 = $j;
  $38 = $ndl;
  $39 = (($38) + ($37)|0);
  HEAP8[$39>>0] = $36;
  $40 = $j;
  $41 = (($40) + 1)|0;
  $j = $41;
 }
 $42 = $hs;
 $43 = $ndl;
 $44 = (_strstr($42,$43)|0);
 $pt = $44;
 $45 = $pt;
 $46 = ($45|0)!=(0|0);
 if (!($46)) {
  $56 = $ndl;
  _free($56);
  $57 = $hs;
  _free($57);
  $58 = $pt;
  STACKTOP = sp;return ($58|0);
 }
 $j = 0;
 while(1) {
  $47 = $pt;
  $48 = $j;
  $49 = $hs;
  $50 = (($49) + ($48)|0);
  $51 = ($47|0)!=($50|0);
  $52 = $j;
  if (!($51)) {
   break;
  }
  $53 = (($52) + 1)|0;
  $j = $53;
 }
 $54 = $0;
 $55 = (($54) + ($52)|0);
 $pt = $55;
 $56 = $ndl;
 _free($56);
 $57 = $hs;
 _free($57);
 $58 = $pt;
 STACKTOP = sp;return ($58|0);
}
function _get_parameter($infile,$kind,$x,$emssg) {
 $infile = $infile|0;
 $kind = $kind|0;
 $x = $x|0;
 $emssg = $emssg|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $infile;
 $1 = $kind;
 $2 = $x;
 $3 = $emssg;
 $4 = $1;
 $5 = $4 << 24 >> 24;
 $6 = $2;
 $7 = $3;
 $8 = _emscripten_asm_const_3(1, ($5|0), ($6|0), ($7|0))|0;
 STACKTOP = sp;return;
}
function _get_parameters($infile,$kind,$x,$emssg) {
 $infile = $infile|0;
 $kind = $kind|0;
 $x = $x|0;
 $emssg = $emssg|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $infile;
 $1 = $kind;
 $2 = $x;
 $3 = $emssg;
 $4 = $1;
 $5 = $4 << 24 >> 24;
 $6 = $2;
 $7 = $3;
 $8 = _emscripten_asm_const_3(2, ($5|0), ($6|0), ($7|0))|0;
 STACKTOP = sp;return;
}
function _next_word($line,$word,$delim) {
 $line = $line|0;
 $word = $word|0;
 $delim = $delim|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0;
 var $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0;
 var $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $flag = 0;
 var $i = 0, $j = 0, $m = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $line;
 $1 = $word;
 $2 = $delim;
 $i = 0;
 $j = 0;
 $m = 0;
 $flag = 1;
 while(1) {
  $3 = $i;
  $4 = $0;
  $5 = (($4) + ($3)|0);
  $6 = HEAP8[$5>>0]|0;
  $7 = $6 << 24 >> 24;
  $8 = ($7|0)!=(0);
  $9 = $flag;
  $10 = ($9|0)!=(0);
  $11 = $8 ? $10 : 0;
  if (!($11)) {
   break;
  }
  $j = 0;
  while(1) {
   $12 = $j;
   $13 = $2;
   $14 = (($13) + ($12)|0);
   $15 = HEAP8[$14>>0]|0;
   $16 = $15 << 24 >> 24;
   $17 = ($16|0)!=(0);
   if (!($17)) {
    break;
   }
   $18 = $i;
   $19 = $0;
   $20 = (($19) + ($18)|0);
   $21 = HEAP8[$20>>0]|0;
   $22 = $21 << 24 >> 24;
   $23 = $j;
   $24 = $2;
   $25 = (($24) + ($23)|0);
   $26 = HEAP8[$25>>0]|0;
   $27 = $26 << 24 >> 24;
   $28 = ($22|0)!=($27|0);
   if (!($28)) {
    break;
   }
   $29 = $j;
   $30 = (($29) + 1)|0;
   $j = $30;
  }
  $31 = $i;
  $32 = $0;
  $33 = (($32) + ($31)|0);
  $34 = HEAP8[$33>>0]|0;
  $35 = $34 << 24 >> 24;
  $36 = $j;
  $37 = $2;
  $38 = (($37) + ($36)|0);
  $39 = HEAP8[$38>>0]|0;
  $40 = $39 << 24 >> 24;
  $41 = ($35|0)==($40|0);
  if ($41) {
   $42 = $i;
   $43 = (($42) + 1)|0;
   $i = $43;
   continue;
  } else {
   $flag = 0;
   continue;
  }
 }
 while(1) {
  $44 = $i;
  $45 = $0;
  $46 = (($45) + ($44)|0);
  $47 = HEAP8[$46>>0]|0;
  $48 = $47 << 24 >> 24;
  $49 = ($48|0)!=(0);
  if (!($49)) {
   break;
  }
  $50 = $flag;
  $51 = ($50|0)!=(0);
  $52 = $51 ^ 1;
  if (!($52)) {
   break;
  }
  $53 = $i;
  $54 = (($53) + 1)|0;
  $i = $54;
  $55 = $0;
  $56 = (($55) + ($53)|0);
  $57 = HEAP8[$56>>0]|0;
  $58 = $m;
  $59 = (($58) + 1)|0;
  $m = $59;
  $60 = $1;
  $61 = (($60) + ($58)|0);
  HEAP8[$61>>0] = $57;
  $62 = $i;
  $63 = $0;
  $64 = (($63) + ($62)|0);
  $65 = HEAP8[$64>>0]|0;
  $66 = $65 << 24 >> 24;
  $67 = ($66|0)!=(0);
  if (!($67)) {
   continue;
  }
  $j = 0;
  while(1) {
   $68 = $j;
   $69 = $2;
   $70 = (($69) + ($68)|0);
   $71 = HEAP8[$70>>0]|0;
   $72 = $71 << 24 >> 24;
   $73 = ($72|0)!=(0);
   if (!($73)) {
    break;
   }
   $74 = $i;
   $75 = $0;
   $76 = (($75) + ($74)|0);
   $77 = HEAP8[$76>>0]|0;
   $78 = $77 << 24 >> 24;
   $79 = $j;
   $80 = $2;
   $81 = (($80) + ($79)|0);
   $82 = HEAP8[$81>>0]|0;
   $83 = $82 << 24 >> 24;
   $84 = ($78|0)!=($83|0);
   if (!($84)) {
    break;
   }
   $85 = $j;
   $86 = (($85) + 1)|0;
   $j = $86;
  }
  $87 = $i;
  $88 = $0;
  $89 = (($88) + ($87)|0);
  $90 = HEAP8[$89>>0]|0;
  $91 = $90 << 24 >> 24;
  $92 = $j;
  $93 = $2;
  $94 = (($93) + ($92)|0);
  $95 = HEAP8[$94>>0]|0;
  $96 = $95 << 24 >> 24;
  $97 = ($91|0)==($96|0);
  if (!($97)) {
   continue;
  }
  $flag = 1;
 }
 $j = 0;
 while(1) {
  $98 = $i;
  $99 = $0;
  $100 = (($99) + ($98)|0);
  $101 = HEAP8[$100>>0]|0;
  $102 = $101 << 24 >> 24;
  $103 = ($102|0)!=(0);
  if (!($103)) {
   break;
  }
  $104 = $i;
  $105 = (($104) + 1)|0;
  $i = $105;
  $106 = $0;
  $107 = (($106) + ($104)|0);
  $108 = HEAP8[$107>>0]|0;
  $109 = $j;
  $110 = (($109) + 1)|0;
  $j = $110;
  $111 = $0;
  $112 = (($111) + ($109)|0);
  HEAP8[$112>>0] = $108;
 }
 $113 = $j;
 $114 = $0;
 $115 = (($114) + ($113)|0);
 HEAP8[$115>>0] = 0;
 $116 = $m;
 $117 = $1;
 $118 = (($117) + ($116)|0);
 HEAP8[$118>>0] = 0;
 STACKTOP = sp;return;
}
function _get_date($word,$emssg) {
 $word = $word|0;
 $emssg = $emssg|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $8 = 0, $9 = 0, $day = 0, $days = 0, $month = 0, $or$cond = 0, $or$cond3 = 0, $or$cond5 = 0;
 var $owrd = 0, $vararg_buffer = 0, $vararg_buffer10 = 0, $vararg_buffer14 = 0, $vararg_buffer17 = 0, $vararg_buffer21 = 0, $vararg_buffer25 = 0, $vararg_buffer28 = 0, $vararg_buffer32 = 0, $vararg_buffer36 = 0, $vararg_buffer39 = 0, $vararg_buffer42 = 0, $vararg_buffer6 = 0, $vararg_ptr13 = 0, $vararg_ptr20 = 0, $vararg_ptr24 = 0, $vararg_ptr31 = 0, $vararg_ptr35 = 0, $vararg_ptr9 = 0, $word1 = 0;
 var $year = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1632|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer42 = sp + 88|0;
 $vararg_buffer39 = sp + 80|0;
 $vararg_buffer36 = sp + 72|0;
 $vararg_buffer32 = sp + 64|0;
 $vararg_buffer28 = sp + 56|0;
 $vararg_buffer25 = sp + 48|0;
 $vararg_buffer21 = sp + 40|0;
 $vararg_buffer17 = sp + 32|0;
 $vararg_buffer14 = sp + 24|0;
 $vararg_buffer10 = sp + 16|0;
 $vararg_buffer6 = sp + 8|0;
 $vararg_buffer = sp;
 $word1 = sp + 1120|0;
 $owrd = sp + 120|0;
 $month = sp + 104|0;
 $day = sp + 100|0;
 $year = sp + 96|0;
 $0 = $word;
 $1 = $emssg;
 $2 = $0;
 (_strcpy($owrd,$2)|0);
 $3 = $0;
 _next_word($3,$word1,57735);
 $4 = (_strncasecmp($word1,57741,3)|0);
 $5 = ($4|0)==(0);
 do {
  if ($5) {
   HEAP32[$month>>2] = 1;
  } else {
   $6 = (_strncasecmp($word1,57745,3)|0);
   $7 = ($6|0)==(0);
   if ($7) {
    HEAP32[$month>>2] = 2;
    break;
   }
   $8 = (_strncasecmp($word1,57749,3)|0);
   $9 = ($8|0)==(0);
   if ($9) {
    HEAP32[$month>>2] = 3;
    break;
   }
   $10 = (_strncasecmp($word1,57753,3)|0);
   $11 = ($10|0)==(0);
   if ($11) {
    HEAP32[$month>>2] = 4;
    break;
   }
   $12 = (_strncasecmp($word1,57757,3)|0);
   $13 = ($12|0)==(0);
   if ($13) {
    HEAP32[$month>>2] = 5;
    break;
   }
   $14 = (_strncasecmp($word1,57761,3)|0);
   $15 = ($14|0)==(0);
   if ($15) {
    HEAP32[$month>>2] = 6;
    break;
   }
   $16 = (_strncasecmp($word1,57765,3)|0);
   $17 = ($16|0)==(0);
   if ($17) {
    HEAP32[$month>>2] = 7;
    break;
   }
   $18 = (_strncasecmp($word1,57769,3)|0);
   $19 = ($18|0)==(0);
   if ($19) {
    HEAP32[$month>>2] = 8;
    break;
   }
   $20 = (_strncasecmp($word1,57773,3)|0);
   $21 = ($20|0)==(0);
   if ($21) {
    HEAP32[$month>>2] = 9;
    break;
   }
   $22 = (_strncasecmp($word1,57777,3)|0);
   $23 = ($22|0)==(0);
   if ($23) {
    HEAP32[$month>>2] = 10;
    break;
   }
   $24 = (_strncasecmp($word1,57781,3)|0);
   $25 = ($24|0)==(0);
   if ($25) {
    HEAP32[$month>>2] = 11;
    break;
   }
   $26 = (_strncasecmp($word1,57785,3)|0);
   $27 = ($26|0)==(0);
   if ($27) {
    HEAP32[$month>>2] = 12;
    break;
   }
   HEAP32[$vararg_buffer>>2] = $month;
   $28 = (_sscanf($word1,57789,$vararg_buffer)|0);
   $29 = ($28|0)!=(1);
   $30 = HEAP32[$month>>2]|0;
   $31 = ($30|0)>(12);
   $or$cond = $29 | $31;
   if ($or$cond) {
    $32 = $1;
    HEAP32[$vararg_buffer6>>2] = $owrd;
    $vararg_ptr9 = ((($vararg_buffer6)) + 4|0);
    HEAP32[$vararg_ptr9>>2] = $32;
    (_printf(57792,$vararg_buffer6)|0);
    $33 = HEAP32[56672>>2]|0;
    $34 = $1;
    HEAP32[$vararg_buffer10>>2] = $owrd;
    $vararg_ptr13 = ((($vararg_buffer10)) + 4|0);
    HEAP32[$vararg_ptr13>>2] = $34;
    (_fprintf($33,57792,$vararg_buffer10)|0);
    _exit(1);
    // unreachable;
   }
  }
 } while(0);
 $35 = $0;
 _next_word($35,$word1,57735);
 HEAP32[$vararg_buffer14>>2] = $day;
 $36 = (_sscanf($word1,57789,$vararg_buffer14)|0);
 $37 = ($36|0)!=(1);
 $38 = HEAP32[$day>>2]|0;
 $39 = ($38|0)>(31);
 $or$cond3 = $37 | $39;
 if ($or$cond3) {
  $40 = $1;
  HEAP32[$vararg_buffer17>>2] = $owrd;
  $vararg_ptr20 = ((($vararg_buffer17)) + 4|0);
  HEAP32[$vararg_ptr20>>2] = $40;
  (_printf(57823,$vararg_buffer17)|0);
  $41 = HEAP32[56672>>2]|0;
  $42 = $1;
  HEAP32[$vararg_buffer21>>2] = $owrd;
  $vararg_ptr24 = ((($vararg_buffer21)) + 4|0);
  HEAP32[$vararg_ptr24>>2] = $42;
  (_fprintf($41,57823,$vararg_buffer21)|0);
  _exit(1);
  // unreachable;
 }
 $43 = $0;
 _next_word($43,$word1,57735);
 HEAP32[$vararg_buffer25>>2] = $year;
 $44 = (_sscanf($word1,57789,$vararg_buffer25)|0);
 $45 = ($44|0)!=(1);
 if ($45) {
  $46 = $1;
  HEAP32[$vararg_buffer28>>2] = $owrd;
  $vararg_ptr31 = ((($vararg_buffer28)) + 4|0);
  HEAP32[$vararg_ptr31>>2] = $46;
  (_printf(57852,$vararg_buffer28)|0);
  $47 = HEAP32[56672>>2]|0;
  $48 = $1;
  HEAP32[$vararg_buffer32>>2] = $owrd;
  $vararg_ptr35 = ((($vararg_buffer32)) + 4|0);
  HEAP32[$vararg_ptr35>>2] = $48;
  (_fprintf($47,57852,$vararg_buffer32)|0);
  _exit(1);
  // unreachable;
 }
 $49 = HEAP32[$year>>2]|0;
 $50 = ($49|0)>(99);
 if ($50) {
  $51 = HEAP32[$year>>2]|0;
  $52 = (($51) - 1900)|0;
  HEAP32[$year>>2] = $52;
 }
 $53 = HEAP32[$year>>2]|0;
 $54 = ($53|0)<(80);
 if ($54) {
  $55 = HEAP32[$year>>2]|0;
  $56 = (($55) + 100)|0;
  HEAP32[$year>>2] = $56;
 }
 $57 = HEAP32[$year>>2]|0;
 $58 = ($57|0)<(85);
 $59 = HEAP32[$year>>2]|0;
 $60 = ($59|0)>(127);
 $or$cond5 = $58 | $60;
 if ($or$cond5) {
  HEAP32[$vararg_buffer36>>2] = $owrd;
  (_printf(57882,$vararg_buffer36)|0);
 }
 $61 = HEAP32[$month>>2]|0;
 do {
  switch ($61|0) {
  case 1:  {
   $days = 0;
   break;
  }
  case 2:  {
   $days = 31;
   break;
  }
  case 3:  {
   $days = 59;
   break;
  }
  case 4:  {
   $days = 90;
   break;
  }
  case 5:  {
   $days = 120;
   break;
  }
  case 6:  {
   $days = 151;
   break;
  }
  case 7:  {
   $days = 181;
   break;
  }
  case 8:  {
   $days = 212;
   break;
  }
  case 9:  {
   $days = 243;
   break;
  }
  case 10:  {
   $days = 273;
   break;
  }
  case 11:  {
   $days = 304;
   break;
  }
  case 12:  {
   $days = 334;
   break;
  }
  default: {
   $62 = HEAP32[$month>>2]|0;
   HEAP32[$vararg_buffer39>>2] = $62;
   (_printf(57949,$vararg_buffer39)|0);
   $63 = HEAP32[56672>>2]|0;
   $64 = HEAP32[$month>>2]|0;
   HEAP32[$vararg_buffer42>>2] = $64;
   (_fprintf($63,57949,$vararg_buffer42)|0);
   _exit(1);
   // unreachable;
  }
  }
 } while(0);
 $65 = $days;
 $66 = HEAP32[$day>>2]|0;
 $67 = (($65) + ($66))|0;
 $68 = HEAP32[$year>>2]|0;
 $69 = (($68) - 80)|0;
 $70 = ($69*365)|0;
 $71 = (($67) + ($70))|0;
 $72 = (($71) - 1)|0;
 $days = $72;
 $73 = $days;
 STACKTOP = sp;return ($73|0);
}
function _read_line($infile,$line) {
 $infile = $infile|0;
 $line = $line|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $j = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $infile;
 $1 = $line;
 $j = 0;
 while(1) {
  $2 = $0;
  $3 = (_getc($2)|0);
  $4 = $3&255;
  $5 = $j;
  $6 = (($5) + 1)|0;
  $j = $6;
  $7 = $1;
  $8 = (($7) + ($5)|0);
  HEAP8[$8>>0] = $4;
  $9 = $0;
  $10 = (_feof($9)|0);
  $11 = ($10|0)!=(0);
  if ($11) {
   break;
  }
  $12 = $j;
  $13 = (($12) - 1)|0;
  $14 = $1;
  $15 = (($14) + ($13)|0);
  $16 = HEAP8[$15>>0]|0;
  $17 = $16 << 24 >> 24;
  $18 = ($17|0)!=(10);
  if (!($18)) {
   break;
  }
 }
 $19 = $j;
 $20 = (($19) - 1)|0;
 $21 = $1;
 $22 = (($21) + ($20)|0);
 HEAP8[$22>>0] = 0;
 STACKTOP = sp;return;
}
function _showline($j) {
 $j = $j|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $j;
 $1 = $0;
 $2 = $0;
 $3 = (8 + ($2<<3)|0);
 $4 = +HEAPF64[$3>>3];
 $5 = _emscripten_asm_const_2(3, ($1|0), (+$4))|0;
 STACKTOP = sp;return;
}
function _shownum($j) {
 $j = $j|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $j;
 $1 = $0;
 $2 = $0;
 $3 = (8 + ($2<<3)|0);
 $4 = +HEAPF64[$3>>3];
 $5 = _emscripten_asm_const_2(4, ($1|0), (+$4))|0;
 STACKTOP = sp;return;
}
function _ShowLineNonZero($j) {
 $j = $j|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0.0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $j;
 $1 = $0;
 $2 = (8 + ($1<<3)|0);
 $3 = +HEAPF64[$2>>3];
 $4 = $3 != 0.0;
 if (!($4)) {
  STACKTOP = sp;return;
 }
 $5 = $0;
 _showline($5);
 STACKTOP = sp;return;
}
function _showline_wmsg($j,$msg) {
 $j = $j|0;
 $msg = $msg|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $j;
 $1 = $msg;
 $2 = $0;
 $3 = $0;
 $4 = (8 + ($3<<3)|0);
 $5 = +HEAPF64[$4>>3];
 $6 = $1;
 $7 = _emscripten_asm_const_3(5, ($2|0), (+$5), ($6|0))|0;
 STACKTOP = sp;return;
}
function _ShowLineNonZero_wMsg($j,$msg) {
 $j = $j|0;
 $msg = $msg|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $j;
 $1 = $msg;
 $2 = $0;
 $3 = (8 + ($2<<3)|0);
 $4 = +HEAPF64[$3>>3];
 $5 = $4 != 0.0;
 if (!($5)) {
  STACKTOP = sp;return;
 }
 $6 = $0;
 $7 = $1;
 _showline_wmsg($6,$7);
 STACKTOP = sp;return;
}
function _showline_wlabel($label,$value) {
 $label = $label|0;
 $value = +$value;
 var $0 = 0, $1 = 0.0, $2 = 0, $3 = 0.0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $label;
 $1 = $value;
 $2 = $0;
 $3 = $1;
 $4 = _emscripten_asm_const_2(6, ($2|0), (+$3))|0;
 STACKTOP = sp;return;
}
function _GetLine($linename,$value) {
 $linename = $linename|0;
 $value = $value|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $word = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 512|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $word = sp + 8|0;
 $0 = $linename;
 $1 = $value;
 $2 = HEAP32[56668>>2]|0;
 $3 = $0;
 _get_parameter($2,115,$word,$3);
 $4 = HEAP32[56668>>2]|0;
 $5 = $1;
 $6 = $0;
 _get_parameters($4,102,$5,$6);
 STACKTOP = sp;return;
}
function _GetLine1($linename,$value) {
 $linename = $linename|0;
 $value = $value|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $word = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 512|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $word = sp + 8|0;
 $0 = $linename;
 $1 = $value;
 $2 = HEAP32[56668>>2]|0;
 $3 = $0;
 _get_parameter($2,115,$word,$3);
 $4 = HEAP32[56668>>2]|0;
 $5 = $1;
 $6 = $0;
 _get_parameter($4,102,$5,$6);
 STACKTOP = sp;return;
}
function _GetLineF($linename,$value) {
 $linename = $linename|0;
 $value = $value|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $linename;
 $1 = $value;
 $2 = $0;
 $3 = $1;
 _GetLine($2,$3);
 $4 = $0;
 $5 = $1;
 $6 = +HEAPF64[$5>>3];
 _showline_wlabel($4,$6);
 STACKTOP = sp;return;
}
function _GetLineFnz($linename,$value) {
 $linename = $linename|0;
 $value = $value|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0, $7 = 0, $8 = 0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $linename;
 $1 = $value;
 $2 = $0;
 $3 = $1;
 _GetLine($2,$3);
 $4 = $1;
 $5 = +HEAPF64[$4>>3];
 $6 = $5 != 0.0;
 if (!($6)) {
  STACKTOP = sp;return;
 }
 $7 = $0;
 $8 = $1;
 $9 = +HEAPF64[$8>>3];
 _showline_wlabel($7,$9);
 STACKTOP = sp;return;
}
function _GetLineS($linename,$value) {
 $linename = $linename|0;
 $value = $value|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $word = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 512|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $word = sp + 8|0;
 $0 = $linename;
 $1 = $value;
 $2 = HEAP32[56668>>2]|0;
 $3 = $0;
 _get_parameter($2,115,$word,$3);
 $4 = HEAP32[56668>>2]|0;
 $5 = $1;
 $6 = $0;
 _get_parameter($4,115,$5,$6);
 STACKTOP = sp;return;
}
function _smallerof($a,$b) {
 $a = +$a;
 $b = +$b;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $a;
 $2 = $b;
 $3 = $1;
 $4 = $2;
 $5 = $3 < $4;
 if ($5) {
  $6 = $1;
  $0 = $6;
 } else {
  $7 = $2;
  $0 = $7;
 }
 $8 = $0;
 STACKTOP = sp;return (+$8);
}
function _largerof($a,$b) {
 $a = +$a;
 $b = +$b;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $a;
 $2 = $b;
 $3 = $1;
 $4 = $2;
 $5 = $3 > $4;
 if ($5) {
  $6 = $1;
  $0 = $6;
 } else {
  $7 = $2;
  $0 = $7;
 }
 $8 = $0;
 STACKTOP = sp;return (+$8);
}
function _NotLessThanZero($a) {
 $a = +$a;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, $3 = 0, $4 = 0.0, $5 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $a;
 $2 = $1;
 $3 = $2 < 0.0;
 if ($3) {
  $0 = 0.0;
 } else {
  $4 = $1;
  $0 = $4;
 }
 $5 = $0;
 STACKTOP = sp;return (+$5);
}
function _absolutev($val) {
 $val = +$val;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, $3 = 0, $4 = 0.0, $5 = 0.0, $6 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $val;
 $2 = $1;
 $3 = $2 >= 0.0;
 $4 = $1;
 if ($3) {
  $0 = $4;
 } else {
  $5 = -$4;
  $0 = $5;
 }
 $6 = $0;
 STACKTOP = sp;return (+$6);
}
function _get_comment($infile,$word) {
 $infile = $infile|0;
 $word = $word|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $8 = 0, $9 = 0, $j = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $0 = $infile;
 $1 = $word;
 $j = 0;
 while(1) {
  $2 = $0;
  $3 = (_getc($2)|0);
  $4 = $3&255;
  $5 = $j;
  $6 = $1;
  $7 = (($6) + ($5)|0);
  HEAP8[$7>>0] = $4;
  $8 = $0;
  $9 = (_feof($8)|0);
  $10 = ($9|0)!=(0);
  if ($10) {
   break;
  }
  $11 = $j;
  $12 = $1;
  $13 = (($12) + ($11)|0);
  $14 = HEAP8[$13>>0]|0;
  $15 = $14 << 24 >> 24;
  $16 = ($15|0)==(32);
  if ($16) {
   continue;
  }
  $17 = $j;
  $18 = $1;
  $19 = (($18) + ($17)|0);
  $20 = HEAP8[$19>>0]|0;
  $21 = $20 << 24 >> 24;
  $22 = ($21|0)==(9);
  if ($22) {
   continue;
  }
  $23 = $j;
  $24 = $1;
  $25 = (($24) + ($23)|0);
  $26 = HEAP8[$25>>0]|0;
  $27 = $26 << 24 >> 24;
  $28 = ($27|0)==(10);
  if ($28) {
   continue;
  }
  $29 = $j;
  $30 = $1;
  $31 = (($30) + ($29)|0);
  $32 = HEAP8[$31>>0]|0;
  $33 = $32 << 24 >> 24;
  $34 = ($33|0)==(13);
  if (!($34)) {
   break;
  }
 }
 $35 = $j;
 $36 = $1;
 $37 = (($36) + ($35)|0);
 $38 = HEAP8[$37>>0]|0;
 $39 = $38 << 24 >> 24;
 $40 = ($39|0)==(123);
 if ($40) {
  while(1) {
   $41 = $0;
   $42 = (_getc($41)|0);
   $43 = $42&255;
   $44 = $j;
   $45 = (($44) + 1)|0;
   $j = $45;
   $46 = $1;
   $47 = (($46) + ($44)|0);
   HEAP8[$47>>0] = $43;
   $48 = $0;
   $49 = (_feof($48)|0);
   $50 = ($49|0)!=(0);
   if ($50) {
    break;
   }
   $51 = $j;
   $52 = (($51) - 1)|0;
   $53 = $1;
   $54 = (($53) + ($52)|0);
   $55 = HEAP8[$54>>0]|0;
   $56 = $55 << 24 >> 24;
   $57 = ($56|0)!=(125);
   if (!($57)) {
    break;
   }
  }
  $58 = $j;
  $59 = $1;
  $60 = (($59) + ($58)|0);
  HEAP8[$60>>0] = 0;
 } else {
  $61 = $j;
  $62 = $1;
  $63 = (($62) + ($61)|0);
  $64 = HEAP8[$63>>0]|0;
  $65 = $64 << 24 >> 24;
  $66 = $0;
  (_ungetc($65,$66)|0);
  $67 = $1;
  HEAP8[$67>>0] = 0;
 }
 $68 = HEAP32[56676>>2]|0;
 $69 = ($68|0)!=(0);
 if (!($69)) {
  STACKTOP = sp;return;
 }
 $70 = $1;
 HEAP32[$vararg_buffer>>2] = $70;
 (_printf(58167,$vararg_buffer)|0);
 STACKTOP = sp;return;
}
function _consume_leading_trailing_whitespace($line) {
 $line = $line|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $j = 0, $k = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $line;
 L1: while(1) {
  $1 = $0;
  $2 = HEAP8[$1>>0]|0;
  $3 = $2 << 24 >> 24;
  $4 = (_isspace($3)|0);
  $5 = ($4|0)!=(0);
  if (!($5)) {
   break;
  }
  $j = 0;
  while(1) {
   $6 = $j;
   $7 = (($6) + 1)|0;
   $8 = $0;
   $9 = (($8) + ($7)|0);
   $10 = HEAP8[$9>>0]|0;
   $11 = $j;
   $12 = $0;
   $13 = (($12) + ($11)|0);
   HEAP8[$13>>0] = $10;
   $14 = $j;
   $15 = (($14) + 1)|0;
   $j = $15;
   $16 = $j;
   $17 = (($16) - 1)|0;
   $18 = $0;
   $19 = (($18) + ($17)|0);
   $20 = HEAP8[$19>>0]|0;
   $21 = $20 << 24 >> 24;
   $22 = ($21|0)!=(0);
   if (!($22)) {
    continue L1;
   }
  }
 }
 $23 = $0;
 $24 = (_strlen($23)|0);
 $25 = (($24) - 1)|0;
 $k = $25;
 while(1) {
  $26 = $k;
  $27 = ($26|0)>=(0);
  if (!($27)) {
   label = 9;
   break;
  }
  $28 = $k;
  $29 = $0;
  $30 = (($29) + ($28)|0);
  $31 = HEAP8[$30>>0]|0;
  $32 = $31 << 24 >> 24;
  $33 = (_isspace($32)|0);
  $34 = ($33|0)!=(0);
  if (!($34)) {
   label = 9;
   break;
  }
  $35 = $k;
  $36 = $0;
  $37 = (($36) + ($35)|0);
  HEAP8[$37>>0] = 0;
  $38 = $k;
  $39 = (($38) + -1)|0;
  $k = $39;
 }
 if ((label|0) == 9) {
  STACKTOP = sp;return;
 }
}
function _GetTextLineF($linename) {
 $linename = $linename|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $k = 0, $line = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, $vararg_ptr2 = 0, $vararg_ptr6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 5040|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer3 = sp + 8|0;
 $vararg_buffer = sp;
 $line = sp + 32|0;
 $1 = $linename;
 $k = 0;
 $2 = HEAP32[56668>>2]|0;
 $3 = $1;
 _get_parameter($2,115,$line,$3);
 $4 = HEAP32[56668>>2]|0;
 $5 = (_getc($4)|0);
 $6 = $5&255;
 $7 = $k;
 $8 = (($line) + ($7)|0);
 HEAP8[$8>>0] = $6;
 while(1) {
  $9 = HEAP32[56668>>2]|0;
  $10 = (_feof($9)|0);
  $11 = ($10|0)!=(0);
  if ($11) {
   $89 = 0;
  } else {
   $12 = $k;
   $13 = (($line) + ($12)|0);
   $14 = HEAP8[$13>>0]|0;
   $15 = $14 << 24 >> 24;
   $16 = ($15|0)!=(10);
   $89 = $16;
  }
  $17 = $k;
  $18 = (($line) + ($17)|0);
  if (!($89)) {
   break;
  }
  $19 = HEAP8[$18>>0]|0;
  $20 = $19 << 24 >> 24;
  $21 = ($20|0)==(123);
  if (!($21)) {
   $45 = $k;
   $46 = (($45) + 1)|0;
   $k = $46;
   $47 = $k;
   $48 = ($47|0)>=(5000);
   if ($48) {
    label = 11;
    break;
   }
   $61 = HEAP32[56668>>2]|0;
   $62 = (_getc($61)|0);
   $63 = $62&255;
   $64 = $k;
   $65 = (($line) + ($64)|0);
   HEAP8[$65>>0] = $63;
   continue;
  }
  while(1) {
   $22 = HEAP32[56668>>2]|0;
   $23 = (_getc($22)|0);
   $24 = $23&255;
   $25 = $k;
   $26 = (($line) + ($25)|0);
   HEAP8[$26>>0] = $24;
   $27 = HEAP32[56668>>2]|0;
   $28 = (_feof($27)|0);
   $29 = ($28|0)!=(0);
   if ($29) {
    break;
   }
   $30 = $k;
   $31 = (($line) + ($30)|0);
   $32 = HEAP8[$31>>0]|0;
   $33 = $32 << 24 >> 24;
   $34 = ($33|0)!=(125);
   if (!($34)) {
    break;
   }
  }
  $35 = $k;
  $36 = (($line) + ($35)|0);
  $37 = HEAP8[$36>>0]|0;
  $38 = $37 << 24 >> 24;
  $39 = ($38|0)==(125);
  if (!($39)) {
   continue;
  }
  $40 = HEAP32[56668>>2]|0;
  $41 = (_getc($40)|0);
  $42 = $41&255;
  $43 = $k;
  $44 = (($line) + ($43)|0);
  HEAP8[$44>>0] = $42;
 }
 if ((label|0) == 11) {
  $49 = $k;
  $50 = (($49) - 1)|0;
  $51 = (($line) + ($50)|0);
  HEAP8[$51>>0] = 0;
  while(1) {
   $52 = HEAP32[56668>>2]|0;
   $53 = (_feof($52)|0);
   $54 = ($53|0)!=(0);
   if ($54) {
    break;
   }
   $55 = HEAP32[56668>>2]|0;
   $56 = (_getc($55)|0);
   $57 = ($56|0)!=(10);
   if (!($57)) {
    break;
   }
  }
  _consume_leading_trailing_whitespace($line);
  $58 = HEAP32[56672>>2]|0;
  $59 = $1;
  HEAP32[$vararg_buffer>>2] = $59;
  $vararg_ptr2 = ((($vararg_buffer)) + 4|0);
  HEAP32[$vararg_ptr2>>2] = $line;
  (_fprintf($58,58186,$vararg_buffer)|0);
  $60 = (___strdup($line)|0);
  $0 = $60;
  $88 = $0;
  STACKTOP = sp;return ($88|0);
 }
 HEAP8[$18>>0] = 0;
 _consume_leading_trailing_whitespace($line);
 $66 = HEAP32[56680>>2]|0;
 $67 = ($66|0)!=(0);
 L23: do {
  if ($67) {
   $k = 0;
   while(1) {
    $68 = $k;
    $69 = (($line) + ($68)|0);
    $70 = HEAP8[$69>>0]|0;
    $71 = $70 << 24 >> 24;
    $72 = ($71|0)!=(0);
    if (!($72)) {
     break L23;
    }
    $73 = $k;
    $74 = (($line) + ($73)|0);
    $75 = HEAP8[$74>>0]|0;
    $76 = $75 << 24 >> 24;
    $77 = (_toupper($76)|0);
    $78 = $77&255;
    $79 = $k;
    $80 = (($line) + ($79)|0);
    HEAP8[$80>>0] = $78;
    $81 = $k;
    $82 = (($81) + 1)|0;
    $k = $82;
   }
  }
 } while(0);
 $83 = HEAP32[56684>>2]|0;
 $84 = ($83|0)!=(0);
 if ($84) {
  $85 = HEAP32[56672>>2]|0;
  $86 = $1;
  HEAP32[$vararg_buffer3>>2] = $86;
  $vararg_ptr6 = ((($vararg_buffer3)) + 4|0);
  HEAP32[$vararg_ptr6>>2] = $line;
  (_fprintf($85,58186,$vararg_buffer3)|0);
 }
 $87 = (___strdup($line)|0);
 $0 = $87;
 $88 = $0;
 STACKTOP = sp;return ($88|0);
}
function _TaxRateFormula($x,$status) {
 $x = +$x;
 $status = $status|0;
 var $0 = 0.0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0.0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0.0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0.0, $26 = 0.0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0, $35 = 0, $36 = 0.0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0.0, $42 = 0.0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $bracket = 0, $sum = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $status;
 $sum = 0.0;
 $bracket = 0;
 $2 = $1;
 $3 = ($2|0)==(5);
 if ($3) {
  $1 = 2;
 }
 $4 = $1;
 $5 = (($4) - 1)|0;
 $1 = $5;
 while(1) {
  $6 = $bracket;
  $7 = (($6) + 1)|0;
  $8 = $1;
  $9 = (8064 + (($8*72)|0)|0);
  $10 = (($9) + ($7<<3)|0);
  $11 = +HEAPF64[$10>>3];
  $12 = $0;
  $13 = $11 < $12;
  if (!($13)) {
   break;
  }
  $14 = $sum;
  $15 = $bracket;
  $16 = (($15) + 1)|0;
  $17 = $1;
  $18 = (8064 + (($17*72)|0)|0);
  $19 = (($18) + ($16<<3)|0);
  $20 = +HEAPF64[$19>>3];
  $21 = $bracket;
  $22 = $1;
  $23 = (8064 + (($22*72)|0)|0);
  $24 = (($23) + ($21<<3)|0);
  $25 = +HEAPF64[$24>>3];
  $26 = $20 - $25;
  $27 = $bracket;
  $28 = $1;
  $29 = (8352 + (($28*72)|0)|0);
  $30 = (($29) + ($27<<3)|0);
  $31 = +HEAPF64[$30>>3];
  $32 = $26 * $31;
  $33 = $14 + $32;
  $sum = $33;
  $34 = $bracket;
  $35 = (($34) + 1)|0;
  $bracket = $35;
 }
 $36 = $0;
 $37 = $bracket;
 $38 = $1;
 $39 = (8064 + (($38*72)|0)|0);
 $40 = (($39) + ($37<<3)|0);
 $41 = +HEAPF64[$40>>3];
 $42 = $36 - $41;
 $43 = $bracket;
 $44 = $1;
 $45 = (8352 + (($44*72)|0)|0);
 $46 = (($45) + ($43<<3)|0);
 $47 = +HEAPF64[$46>>3];
 $48 = $42 * $47;
 $49 = $sum;
 $50 = $48 + $49;
 STACKTOP = sp;return (+$50);
}
function _Report_bracket_info($x,$addedtx,$status) {
 $x = +$x;
 $addedtx = +$addedtx;
 $status = $status|0;
 var $0 = 0.0, $1 = 0.0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0.0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0.0, $24 = 0.0, $25 = 0.0, $26 = 0.0;
 var $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0.0, $30 = 0.0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0, $5 = 0.0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, $bracket = 0, $tx = 0.0, $vararg_buffer = 0, $vararg_buffer2 = 0, $vararg_ptr1 = 0, $vararg_ptr5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer2 = sp + 40|0;
 $vararg_buffer = sp + 24|0;
 $0 = $x;
 $1 = $addedtx;
 $2 = $status;
 $bracket = 0;
 $3 = $0;
 $4 = $2;
 $5 = (+_TaxRateFormula($3,$4));
 $tx = $5;
 $6 = $2;
 $7 = ($6|0)==(5);
 if ($7) {
  $2 = 2;
 }
 $8 = $2;
 $9 = (($8) - 1)|0;
 $2 = $9;
 while(1) {
  $10 = $bracket;
  $11 = (($10) + 1)|0;
  $12 = $2;
  $13 = (8064 + (($12*72)|0)|0);
  $14 = (($13) + ($11<<3)|0);
  $15 = +HEAPF64[$14>>3];
  $16 = $0;
  $17 = $15 < $16;
  $18 = $bracket;
  if (!($17)) {
   break;
  }
  $19 = (($18) + 1)|0;
  $bracket = $19;
 }
 $20 = $2;
 $21 = (8352 + (($20*72)|0)|0);
 $22 = (($21) + ($18<<3)|0);
 $23 = +HEAPF64[$22>>3];
 $24 = 100.0 * $23;
 $25 = $tx;
 $26 = $1;
 $27 = $25 + $26;
 $28 = 100.0 * $27;
 $29 = $0;
 $30 = $28 / $29;
 HEAPF64[$vararg_buffer>>3] = $24;
 $vararg_ptr1 = ((($vararg_buffer)) + 8|0);
 HEAPF64[$vararg_ptr1>>3] = $30;
 (_printf(58193,$vararg_buffer)|0);
 $31 = HEAP32[56672>>2]|0;
 $32 = $bracket;
 $33 = $2;
 $34 = (8352 + (($33*72)|0)|0);
 $35 = (($34) + ($32<<3)|0);
 $36 = +HEAPF64[$35>>3];
 $37 = 100.0 * $36;
 $38 = $tx;
 $39 = $1;
 $40 = $38 + $39;
 $41 = 100.0 * $40;
 $42 = $0;
 $43 = $41 / $42;
 HEAPF64[$vararg_buffer2>>3] = $37;
 $vararg_ptr5 = ((($vararg_buffer2)) + 8|0);
 HEAPF64[$vararg_ptr5>>3] = $43;
 (_fprintf($31,58193,$vararg_buffer2)|0);
 STACKTOP = sp;return;
}
function _TaxRateFunction($income,$status) {
 $income = +$income;
 $status = $status|0;
 var $0 = 0.0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0, $15 = 0.0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0.0, $21 = 0.0, $22 = 0, $23 = 0.0, $24 = 0.0, $25 = 0, $26 = 0.0;
 var $27 = 0, $28 = 0.0, $29 = 0.0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0.0, $7 = 0, $8 = 0.0, $9 = 0.0, $dx = 0.0, $k = 0, $tx = 0.0, $x = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $income;
 $1 = $status;
 $2 = $0;
 $3 = $2 < 1.0E+5;
 $4 = $0;
 if (!($3)) {
  $27 = $1;
  $28 = (+_TaxRateFormula($4,$27));
  $tx = $28;
  $29 = $tx;
  STACKTOP = sp;return (+$29);
 }
 $5 = $4 <= 25.0;
 do {
  if ($5) {
   $x = 5.0;
  } else {
   $6 = $0;
   $7 = $6 <= 3000.0;
   if ($7) {
    $x = 25.0;
    break;
   } else {
    $x = 50.0;
    break;
   }
  }
 } while(0);
 $8 = $x;
 $9 = 0.5 * $8;
 $dx = $9;
 $10 = $0;
 $11 = $10 - 9.9999999999999995E-7;
 $12 = $x;
 $13 = $11 / $12;
 $14 = (~~(($13)));
 $k = $14;
 $15 = $x;
 $16 = $k;
 $17 = (+($16|0));
 $18 = $15 * $17;
 $19 = $dx;
 $20 = $18 + $19;
 $x = $20;
 $21 = $x;
 $22 = $1;
 $23 = (+_TaxRateFormula($21,$22));
 $24 = $23 + 0.5;
 $25 = (~~(($24)));
 $26 = (+($25|0));
 $tx = $26;
 $29 = $tx;
 STACKTOP = sp;return (+$29);
}
function _showschedA($linenum) {
 $linenum = $linenum|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $linenum;
 $1 = $0;
 $2 = $0;
 $3 = (8640 + ($2<<3)|0);
 $4 = +HEAPF64[$3>>3];
 $5 = _emscripten_asm_const_2(7, ($1|0), (+$4))|0;
 STACKTOP = sp;return;
}
function _showschedA_wMsg($linenum,$msg) {
 $linenum = $linenum|0;
 $msg = $msg|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $linenum;
 $1 = $msg;
 $2 = $0;
 $3 = $0;
 $4 = (8640 + ($3<<3)|0);
 $5 = +HEAPF64[$4>>3];
 $6 = $1;
 $7 = _emscripten_asm_const_3(8, ($2|0), (+$5), ($6|0))|0;
 STACKTOP = sp;return;
}
function _print2($msg) {
 $msg = $msg|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer1 = sp + 8|0;
 $vararg_buffer = sp;
 $0 = $msg;
 $1 = $0;
 HEAP32[$vararg_buffer>>2] = $1;
 (_printf(58164,$vararg_buffer)|0);
 $2 = HEAP32[56672>>2]|0;
 $3 = $0;
 HEAP32[$vararg_buffer1>>2] = $3;
 (_fprintf($2,58164,$vararg_buffer1)|0);
 STACKTOP = sp;return;
}
function _capgains_qualdividends_worksheets($status,$L9b) {
 $status = $status|0;
 $L9b = +$L9b;
 var $0 = 0, $1 = 0.0, $10 = 0.0, $100 = 0, $101 = 0.0, $102 = 0, $103 = 0.0, $104 = 0.0, $105 = 0.0, $106 = 0, $107 = 0, $108 = 0.0, $109 = 0, $11 = 0, $110 = 0.0, $111 = 0.0, $112 = 0, $113 = 0, $114 = 0.0, $115 = 0.0;
 var $116 = 0, $117 = 0, $118 = 0.0, $119 = 0, $12 = 0, $120 = 0.0, $121 = 0.0, $122 = 0, $123 = 0, $124 = 0.0, $125 = 0, $126 = 0.0, $127 = 0.0, $128 = 0, $129 = 0, $13 = 0, $130 = 0.0, $131 = 0.0, $132 = 0, $133 = 0;
 var $134 = 0.0, $135 = 0, $136 = 0.0, $137 = 0, $138 = 0, $139 = 0.0, $14 = 0.0, $140 = 0, $141 = 0.0, $142 = 0.0, $143 = 0, $144 = 0.0, $145 = 0.0, $146 = 0, $147 = 0, $148 = 0.0, $149 = 0, $15 = 0.0, $150 = 0.0, $151 = 0;
 var $152 = 0, $153 = 0.0, $154 = 0, $155 = 0.0, $156 = 0.0, $157 = 0, $158 = 0, $159 = 0, $16 = 0.0, $160 = 0, $161 = 0, $162 = 0, $163 = 0.0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0.0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0.0, $174 = 0, $175 = 0, $176 = 0, $177 = 0.0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0, $24 = 0.0, $25 = 0.0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0.0, $3 = 0, $30 = 0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0, $35 = 0, $36 = 0.0, $37 = 0, $38 = 0.0, $39 = 0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0, $44 = 0, $45 = 0.0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0.0, $52 = 0, $53 = 0.0, $54 = 0.0, $55 = 0, $56 = 0, $57 = 0.0, $58 = 0, $59 = 0.0, $6 = 0, $60 = 0.0, $61 = 0, $62 = 0, $63 = 0.0, $64 = 0;
 var $65 = 0.0, $66 = 0.0, $67 = 0, $68 = 0, $69 = 0.0, $7 = 0, $70 = 0, $71 = 0.0, $72 = 0.0, $73 = 0, $74 = 0, $75 = 0.0, $76 = 0, $77 = 0, $78 = 0.0, $79 = 0, $8 = 0.0, $80 = 0.0, $81 = 0.0, $82 = 0;
 var $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0.0, $9 = 0, $90 = 0, $91 = 0.0, $92 = 0.0, $93 = 0, $94 = 0, $95 = 0.0, $96 = 0, $97 = 0.0, $98 = 0.0, $99 = 0, $j = 0, $vararg_buffer = 0;
 var $vararg_buffer2 = 0, $vararg_buffer4 = 0, $vararg_buffer6 = 0, $vararg_ptr1 = 0, $vararg_ptr9 = 0, $ws = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 464|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer6 = sp + 440|0;
 $vararg_buffer4 = sp + 432|0;
 $vararg_buffer2 = sp + 424|0;
 $vararg_buffer = sp + 408|0;
 $ws = sp;
 $0 = $status;
 $1 = $L9b;
 $j = 0;
 while(1) {
  $2 = $j;
  $3 = ($2|0)<(50);
  if (!($3)) {
   break;
  }
  $4 = $j;
  $5 = (($ws) + ($4<<3)|0);
  HEAPF64[$5>>3] = 0.0;
  $6 = $j;
  $7 = (($6) + 1)|0;
  $j = $7;
 }
 $8 = +HEAPF64[(352)>>3];
 $9 = ((($ws)) + 8|0);
 HEAPF64[$9>>3] = $8;
 $10 = $1;
 $11 = ((($ws)) + 16|0);
 HEAPF64[$11>>3] = $10;
 $12 = HEAP32[56688>>2]|0;
 $13 = ($12|0)!=(0);
 if ($13) {
  $14 = +HEAPF64[(16760)>>3];
  $15 = +HEAPF64[(16768)>>3];
  $16 = (+_smallerof($14,$15));
  $17 = (+_NotLessThanZero($16));
  $18 = ((($ws)) + 24|0);
  HEAPF64[$18>>3] = $17;
 } else {
  $19 = +HEAPF64[(112)>>3];
  $20 = ((($ws)) + 24|0);
  HEAPF64[$20>>3] = $19;
 }
 $21 = ((($ws)) + 16|0);
 $22 = +HEAPF64[$21>>3];
 $23 = ((($ws)) + 24|0);
 $24 = +HEAPF64[$23>>3];
 $25 = $22 + $24;
 $26 = ((($ws)) + 32|0);
 HEAPF64[$26>>3] = $25;
 $27 = ((($ws)) + 40|0);
 HEAPF64[$27>>3] = 0.0;
 $28 = ((($ws)) + 32|0);
 $29 = +HEAPF64[$28>>3];
 $30 = ((($ws)) + 40|0);
 $31 = +HEAPF64[$30>>3];
 $32 = $29 - $31;
 $33 = (+_NotLessThanZero($32));
 $34 = ((($ws)) + 48|0);
 HEAPF64[$34>>3] = $33;
 $35 = ((($ws)) + 48|0);
 $36 = +HEAPF64[$35>>3];
 HEAPF64[8024>>3] = $36;
 $37 = ((($ws)) + 8|0);
 $38 = +HEAPF64[$37>>3];
 $39 = ((($ws)) + 48|0);
 $40 = +HEAPF64[$39>>3];
 $41 = $38 - $40;
 $42 = (+_NotLessThanZero($41));
 $43 = ((($ws)) + 56|0);
 HEAPF64[$43>>3] = $42;
 $44 = ((($ws)) + 56|0);
 $45 = +HEAPF64[$44>>3];
 HEAPF64[8032>>3] = $45;
 $46 = $0;
 switch ($46|0) {
 case 3: case 1:  {
  $47 = ((($ws)) + 64|0);
  HEAPF64[$47>>3] = 37650.0;
  break;
 }
 case 5: case 2:  {
  $48 = ((($ws)) + 64|0);
  HEAPF64[$48>>3] = 75300.0;
  break;
 }
 case 4:  {
  $49 = ((($ws)) + 64|0);
  HEAPF64[$49>>3] = 50400.0;
  break;
 }
 default: {
 }
 }
 $50 = ((($ws)) + 8|0);
 $51 = +HEAPF64[$50>>3];
 $52 = ((($ws)) + 64|0);
 $53 = +HEAPF64[$52>>3];
 $54 = (+_smallerof($51,$53));
 $55 = ((($ws)) + 72|0);
 HEAPF64[$55>>3] = $54;
 $56 = ((($ws)) + 56|0);
 $57 = +HEAPF64[$56>>3];
 $58 = ((($ws)) + 72|0);
 $59 = +HEAPF64[$58>>3];
 $60 = (+_smallerof($57,$59));
 $61 = ((($ws)) + 80|0);
 HEAPF64[$61>>3] = $60;
 $62 = ((($ws)) + 72|0);
 $63 = +HEAPF64[$62>>3];
 $64 = ((($ws)) + 80|0);
 $65 = +HEAPF64[$64>>3];
 $66 = $63 - $65;
 $67 = ((($ws)) + 88|0);
 HEAPF64[$67>>3] = $66;
 $68 = ((($ws)) + 8|0);
 $69 = +HEAPF64[$68>>3];
 $70 = ((($ws)) + 48|0);
 $71 = +HEAPF64[$70>>3];
 $72 = (+_smallerof($69,$71));
 $73 = ((($ws)) + 96|0);
 HEAPF64[$73>>3] = $72;
 $74 = ((($ws)) + 88|0);
 $75 = +HEAPF64[$74>>3];
 $76 = ((($ws)) + 104|0);
 HEAPF64[$76>>3] = $75;
 $77 = ((($ws)) + 96|0);
 $78 = +HEAPF64[$77>>3];
 $79 = ((($ws)) + 104|0);
 $80 = +HEAPF64[$79>>3];
 $81 = $78 - $80;
 $82 = ((($ws)) + 112|0);
 HEAPF64[$82>>3] = $81;
 $83 = $0;
 switch ($83|0) {
 case 1:  {
  $84 = ((($ws)) + 120|0);
  HEAPF64[$84>>3] = 415050.0;
  break;
 }
 case 3:  {
  $85 = ((($ws)) + 120|0);
  HEAPF64[$85>>3] = 233475.0;
  break;
 }
 case 5: case 2:  {
  $86 = ((($ws)) + 120|0);
  HEAPF64[$86>>3] = 466950.0;
  break;
 }
 case 4:  {
  $87 = ((($ws)) + 120|0);
  HEAPF64[$87>>3] = 441000.0;
  break;
 }
 default: {
 }
 }
 $88 = ((($ws)) + 8|0);
 $89 = +HEAPF64[$88>>3];
 $90 = ((($ws)) + 120|0);
 $91 = +HEAPF64[$90>>3];
 $92 = (+_smallerof($89,$91));
 $93 = ((($ws)) + 128|0);
 HEAPF64[$93>>3] = $92;
 $94 = ((($ws)) + 56|0);
 $95 = +HEAPF64[$94>>3];
 $96 = ((($ws)) + 88|0);
 $97 = +HEAPF64[$96>>3];
 $98 = $95 + $97;
 $99 = ((($ws)) + 136|0);
 HEAPF64[$99>>3] = $98;
 $100 = ((($ws)) + 128|0);
 $101 = +HEAPF64[$100>>3];
 $102 = ((($ws)) + 136|0);
 $103 = +HEAPF64[$102>>3];
 $104 = $101 - $103;
 $105 = (+_NotLessThanZero($104));
 $106 = ((($ws)) + 144|0);
 HEAPF64[$106>>3] = $105;
 $107 = ((($ws)) + 112|0);
 $108 = +HEAPF64[$107>>3];
 $109 = ((($ws)) + 144|0);
 $110 = +HEAPF64[$109>>3];
 $111 = (+_smallerof($108,$110));
 $112 = ((($ws)) + 152|0);
 HEAPF64[$112>>3] = $111;
 $113 = ((($ws)) + 152|0);
 $114 = +HEAPF64[$113>>3];
 $115 = 0.14999999999999999 * $114;
 $116 = ((($ws)) + 160|0);
 HEAPF64[$116>>3] = $115;
 $117 = ((($ws)) + 88|0);
 $118 = +HEAPF64[$117>>3];
 $119 = ((($ws)) + 152|0);
 $120 = +HEAPF64[$119>>3];
 $121 = $118 + $120;
 $122 = ((($ws)) + 168|0);
 HEAPF64[$122>>3] = $121;
 $123 = ((($ws)) + 96|0);
 $124 = +HEAPF64[$123>>3];
 $125 = ((($ws)) + 168|0);
 $126 = +HEAPF64[$125>>3];
 $127 = $124 - $126;
 $128 = ((($ws)) + 176|0);
 HEAPF64[$128>>3] = $127;
 $129 = ((($ws)) + 176|0);
 $130 = +HEAPF64[$129>>3];
 $131 = 0.20000000000000001 * $130;
 $132 = ((($ws)) + 184|0);
 HEAPF64[$132>>3] = $131;
 $133 = ((($ws)) + 56|0);
 $134 = +HEAPF64[$133>>3];
 $135 = $0;
 $136 = (+_TaxRateFunction($134,$135));
 $137 = ((($ws)) + 192|0);
 HEAPF64[$137>>3] = $136;
 $138 = ((($ws)) + 160|0);
 $139 = +HEAPF64[$138>>3];
 $140 = ((($ws)) + 184|0);
 $141 = +HEAPF64[$140>>3];
 $142 = $139 + $141;
 $143 = ((($ws)) + 192|0);
 $144 = +HEAPF64[$143>>3];
 $145 = $142 + $144;
 $146 = ((($ws)) + 200|0);
 HEAPF64[$146>>3] = $145;
 $147 = ((($ws)) + 8|0);
 $148 = +HEAPF64[$147>>3];
 $149 = $0;
 $150 = (+_TaxRateFunction($148,$149));
 $151 = ((($ws)) + 208|0);
 HEAPF64[$151>>3] = $150;
 $152 = ((($ws)) + 200|0);
 $153 = +HEAPF64[$152>>3];
 $154 = ((($ws)) + 208|0);
 $155 = +HEAPF64[$154>>3];
 $156 = (+_smallerof($153,$155));
 $157 = ((($ws)) + 216|0);
 HEAPF64[$157>>3] = $156;
 $j = 1;
 while(1) {
  $158 = $j;
  $159 = ($158|0)<=(27);
  if (!($159)) {
   break;
  }
  $160 = $j;
  $161 = $j;
  $162 = (($ws) + ($161<<3)|0);
  $163 = +HEAPF64[$162>>3];
  HEAP32[$vararg_buffer>>2] = $160;
  $vararg_ptr1 = ((($vararg_buffer)) + 8|0);
  HEAPF64[$vararg_ptr1>>3] = $163;
  (_printf(58401,$vararg_buffer)|0);
  $164 = $j;
  $165 = ($164|0)==(3);
  do {
   if ($165) {
    $166 = HEAP32[56688>>2]|0;
    $167 = ($166|0)!=(0);
    $168 = HEAP32[56672>>2]|0;
    if ($167) {
     (_fprintf($168,58442,$vararg_buffer2)|0);
     break;
    } else {
     (_fprintf($168,58459,$vararg_buffer4)|0);
     break;
    }
   }
  } while(0);
  $169 = HEAP32[56672>>2]|0;
  $170 = $j;
  $171 = $j;
  $172 = (($ws) + ($171<<3)|0);
  $173 = +HEAPF64[$172>>3];
  HEAP32[$vararg_buffer6>>2] = $170;
  $vararg_ptr9 = ((($vararg_buffer6)) + 8|0);
  HEAPF64[$vararg_ptr9>>3] = $173;
  (_fprintf($169,58401,$vararg_buffer6)|0);
  $174 = $j;
  $175 = (($174) + 1)|0;
  $j = $175;
 }
 $176 = ((($ws)) + 216|0);
 $177 = +HEAPF64[$176>>3];
 HEAPF64[(360)>>3] = $177;
 STACKTOP = sp;return;
}
function _form6251_AlternativeMinimumTax($itemized) {
 $itemized = $itemized|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0.0, $103 = 0.0, $104 = 0, $105 = 0, $106 = 0.0, $107 = 0.0, $108 = 0.0, $109 = 0.0, $11 = 0, $110 = 0.0, $111 = 0, $112 = 0, $113 = 0, $114 = 0.0, $115 = 0.0;
 var $116 = 0, $117 = 0.0, $118 = 0, $119 = 0, $12 = 0.0, $120 = 0.0, $121 = 0.0, $122 = 0, $123 = 0, $124 = 0.0, $125 = 0, $126 = 0, $127 = 0.0, $128 = 0, $129 = 0.0, $13 = 0, $130 = 0, $131 = 0, $132 = 0.0, $133 = 0;
 var $134 = 0.0, $135 = 0.0, $136 = 0.0, $137 = 0, $138 = 0, $139 = 0.0, $14 = 0, $140 = 0.0, $141 = 0, $142 = 0, $143 = 0.0, $144 = 0, $145 = 0.0, $146 = 0.0, $147 = 0.0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0.0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0.0, $159 = 0, $16 = 0.0, $160 = 0, $161 = 0, $162 = 0, $163 = 0.0, $164 = 0, $165 = 0, $166 = 0, $167 = 0.0, $168 = 0, $169 = 0, $17 = 0.0;
 var $170 = 0.0, $171 = 0, $172 = 0.0, $173 = 0.0, $174 = 0.0, $175 = 0, $176 = 0, $177 = 0.0, $178 = 0, $179 = 0.0, $18 = 0.0, $180 = 0, $181 = 0.0, $182 = 0, $183 = 0.0, $184 = 0, $185 = 0.0, $186 = 0, $187 = 0, $188 = 0.0;
 var $189 = 0.0, $19 = 0.0, $190 = 0, $191 = 0, $192 = 0.0, $193 = 0.0, $194 = 0, $195 = 0.0, $196 = 0.0, $197 = 0.0, $198 = 0, $199 = 0, $2 = 0, $20 = 0.0, $200 = 0.0, $201 = 0, $202 = 0.0, $203 = 0.0, $204 = 0.0, $205 = 0;
 var $206 = 0.0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0.0, $212 = 0, $213 = 0.0, $214 = 0.0, $215 = 0.0, $216 = 0.0, $217 = 0, $218 = 0, $219 = 0, $22 = 0.0, $220 = 0.0, $221 = 0, $222 = 0.0, $223 = 0.0;
 var $224 = 0, $225 = 0, $226 = 0.0, $227 = 0, $228 = 0.0, $229 = 0.0, $23 = 0, $230 = 0, $231 = 0, $232 = 0.0, $233 = 0.0, $234 = 0, $235 = 0, $236 = 0.0, $237 = 0.0, $238 = 0, $239 = 0.0, $24 = 0, $240 = 0.0, $241 = 0.0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0.0, $248 = 0.0, $249 = 0.0, $25 = 0.0, $250 = 0, $251 = 0, $252 = 0.0, $253 = 0, $254 = 0.0, $255 = 0.0, $256 = 0.0, $257 = 0, $258 = 0, $259 = 0.0, $26 = 0;
 var $260 = 0, $261 = 0.0, $262 = 0.0, $263 = 0, $264 = 0, $265 = 0.0, $266 = 0, $267 = 0.0, $268 = 0.0, $269 = 0, $27 = 0.0, $270 = 0, $271 = 0.0, $272 = 0, $273 = 0.0, $274 = 0.0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0.0, $280 = 0, $281 = 0, $282 = 0, $283 = 0.0, $284 = 0, $285 = 0.0, $286 = 0, $287 = 0.0, $288 = 0, $289 = 0.0, $29 = 0, $290 = 0.0, $291 = 0.0, $292 = 0.0, $293 = 0, $294 = 0.0, $295 = 0.0, $296 = 0;
 var $297 = 0, $298 = 0.0, $299 = 0, $3 = 0, $30 = 0, $300 = 0.0, $301 = 0.0, $302 = 0, $303 = 0, $304 = 0.0, $305 = 0, $306 = 0.0, $307 = 0.0, $308 = 0.0, $309 = 0, $31 = 0.0, $310 = 0, $311 = 0.0, $312 = 0, $313 = 0.0;
 var $314 = 0.0, $315 = 0, $316 = 0, $317 = 0.0, $318 = 0.0, $319 = 0, $32 = 0.0, $320 = 0, $321 = 0.0, $322 = 0, $323 = 0.0, $324 = 0.0, $325 = 0, $326 = 0, $327 = 0.0, $328 = 0, $329 = 0.0, $33 = 0.0, $330 = 0.0, $331 = 0.0;
 var $332 = 0, $333 = 0, $334 = 0.0, $335 = 0, $336 = 0.0, $337 = 0.0, $338 = 0, $339 = 0, $34 = 0, $340 = 0.0, $341 = 0.0, $342 = 0, $343 = 0, $344 = 0.0, $345 = 0, $346 = 0, $347 = 0.0, $348 = 0, $349 = 0.0, $35 = 0.0;
 var $350 = 0.0, $351 = 0, $352 = 0.0, $353 = 0.0, $354 = 0, $355 = 0, $356 = 0.0, $357 = 0, $358 = 0.0, $359 = 0.0, $36 = 0, $360 = 0, $361 = 0, $362 = 0.0, $363 = 0.0, $364 = 0, $365 = 0, $366 = 0.0, $367 = 0, $368 = 0.0;
 var $369 = 0.0, $37 = 0.0, $370 = 0, $371 = 0.0, $372 = 0.0, $373 = 0, $374 = 0.0, $375 = 0.0, $376 = 0, $377 = 0, $378 = 0.0, $379 = 0.0, $38 = 0.0, $380 = 0, $381 = 0, $382 = 0.0, $383 = 0.0, $384 = 0, $385 = 0.0, $386 = 0.0;
 var $387 = 0.0, $388 = 0, $389 = 0, $39 = 0.0, $390 = 0.0, $391 = 0, $392 = 0.0, $393 = 0.0, $394 = 0, $395 = 0, $396 = 0.0, $397 = 0, $398 = 0.0, $399 = 0, $4 = 0, $40 = 0.0, $400 = 0, $401 = 0.0, $402 = 0, $403 = 0.0;
 var $404 = 0.0, $405 = 0, $406 = 0.0, $407 = 0.0, $408 = 0.0, $409 = 0.0, $41 = 0, $410 = 0.0, $411 = 0, $412 = 0, $413 = 0.0, $414 = 0, $415 = 0.0, $416 = 0.0, $417 = 0.0, $418 = 0, $419 = 0, $42 = 0, $420 = 0.0, $421 = 0;
 var $422 = 0.0, $423 = 0, $424 = 0, $425 = 0, $426 = 0.0, $427 = 0, $428 = 0.0, $429 = 0, $43 = 0, $430 = 0, $431 = 0.0, $432 = 0, $433 = 0, $434 = 0.0, $435 = 0.0, $436 = 0, $437 = 0, $438 = 0, $439 = 0.0, $44 = 0.0;
 var $440 = 0.0, $441 = 0, $442 = 0, $443 = 0, $444 = 0.0, $445 = 0, $446 = 0.0, $447 = 0, $448 = 0, $449 = 0, $45 = 0.0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0.0, $455 = 0, $456 = 0, $457 = 0, $458 = 0;
 var $459 = 0.0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0.0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0.0, $47 = 0, $470 = 0, $471 = 0.0, $472 = 0, $473 = 0.0, $48 = 0, $49 = 0, $5 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0.0, $68 = 0;
 var $69 = 0, $7 = 0, $70 = 0.0, $71 = 0.0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0.0, $79 = 0, $8 = 0, $80 = 0, $81 = 0.0, $82 = 0.0, $83 = 0, $84 = 0, $85 = 0, $86 = 0.0;
 var $87 = 0, $88 = 0.0, $89 = 0.0, $9 = 0, $90 = 0.0, $91 = 0.0, $92 = 0, $93 = 0, $94 = 0, $95 = 0.0, $96 = 0.0, $97 = 0, $98 = 0, $99 = 0.0, $amtexmption = 0.0, $amtws = 0, $j = 0, $offsetA = 0.0, $or$cond = 0, $or$cond3 = 0;
 var $or$cond5 = 0, $sum8_27 = 0.0, $thresholdA = 0.0, $thresholdB = 0.0, $thresholdC = 0.0, $vararg_buffer = 0, $vararg_buffer10 = 0, $vararg_buffer14 = 0, $vararg_buffer18 = 0, $vararg_buffer21 = 0, $vararg_buffer25 = 0, $vararg_buffer28 = 0, $vararg_buffer32 = 0, $vararg_buffer34 = 0, $vararg_buffer38 = 0, $vararg_buffer42 = 0, $vararg_buffer45 = 0, $vararg_buffer6 = 0, $vararg_buffer8 = 0, $vararg_ptr13 = 0;
 var $vararg_ptr17 = 0, $vararg_ptr24 = 0, $vararg_ptr31 = 0, $vararg_ptr37 = 0, $vararg_ptr41 = 0, $ws = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1824|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer45 = sp + 1800|0;
 $vararg_buffer42 = sp + 1792|0;
 $vararg_buffer38 = sp + 1776|0;
 $vararg_buffer34 = sp + 1760|0;
 $vararg_buffer32 = sp + 1752|0;
 $vararg_buffer28 = sp + 1736|0;
 $vararg_buffer25 = sp + 1728|0;
 $vararg_buffer21 = sp + 1712|0;
 $vararg_buffer18 = sp + 1704|0;
 $vararg_buffer14 = sp + 1688|0;
 $vararg_buffer10 = sp + 1672|0;
 $vararg_buffer8 = sp + 1664|0;
 $vararg_buffer6 = sp + 1656|0;
 $vararg_buffer = sp + 1648|0;
 $amtws = sp + 848|0;
 $ws = sp + 48|0;
 $0 = $itemized;
 $thresholdA = 0.0;
 $thresholdB = 0.0;
 $thresholdC = 186300.0;
 $offsetA = 3726.0;
 $sum8_27 = 0.0;
 (_printf(58475,$vararg_buffer)|0);
 $1 = HEAP32[56672>>2]|0;
 (_fprintf($1,58475,$vararg_buffer6)|0);
 $j = 0;
 while(1) {
  $2 = $j;
  $3 = ($2|0)<(100);
  if (!($3)) {
   break;
  }
  $4 = $j;
  $5 = (($amtws) + ($4<<3)|0);
  HEAPF64[$5>>3] = 0.0;
  $6 = $j;
  $7 = (($ws) + ($6<<3)|0);
  HEAPF64[$7>>3] = 0.0;
  $8 = $j;
  $9 = (($8) + 1)|0;
  $j = $9;
 }
 $10 = $0;
 $11 = ($10|0)!=(0);
 do {
  if ($11) {
   $12 = +HEAPF64[(336)>>3];
   $13 = ((($amtws)) + 8|0);
   HEAPF64[$13>>3] = $12;
   $14 = HEAP32[56700>>2]|0;
   $15 = ($14|0)!=(0);
   if ($15) {
    $16 = +HEAPF64[(8672)>>3];
    $17 = +HEAPF64[(312)>>3];
    $18 = 0.025000000000000001 * $17;
    $19 = (+_smallerof($16,$18));
    $20 = (+_NotLessThanZero($19));
    $21 = ((($amtws)) + 16|0);
    HEAPF64[$21>>3] = $20;
   }
   $22 = +HEAPF64[(8712)>>3];
   $23 = ((($amtws)) + 24|0);
   HEAPF64[$23>>3] = $22;
   $24 = ((($amtws)) + 32|0);
   HEAPF64[$24>>3] = 0.0;
   $25 = +HEAPF64[(8856)>>3];
   $26 = ((($amtws)) + 40|0);
   HEAPF64[$26>>3] = $25;
   $27 = +HEAPF64[(312)>>3];
   $28 = +HEAPF64[8056>>3];
   $29 = $27 <= $28;
   if ($29) {
    $30 = ((($amtws)) + 48|0);
    HEAPF64[$30>>3] = 0.0;
    break;
   } else {
    $31 = +HEAPF64[(24712)>>3];
    $32 = (+_absolutev($31));
    $33 = -$32;
    $34 = ((($amtws)) + 48|0);
    HEAPF64[$34>>3] = $33;
    break;
   }
  } else {
   $35 = +HEAPF64[(312)>>3];
   $36 = ((($amtws)) + 8|0);
   HEAPF64[$36>>3] = $35;
  }
 } while(0);
 $37 = +HEAPF64[(88)>>3];
 $38 = +HEAPF64[(176)>>3];
 $39 = $37 + $38;
 $40 = -$39;
 $41 = ((($amtws)) + 56|0);
 HEAPF64[$41>>3] = $40;
 $42 = ((($amtws)) + 64|0);
 HEAPF64[$42>>3] = 0.0;
 $43 = ((($amtws)) + 72|0);
 HEAPF64[$43>>3] = 0.0;
 $44 = +HEAPF64[(176)>>3];
 $45 = (+_absolutev($44));
 $46 = ((($amtws)) + 80|0);
 HEAPF64[$46>>3] = $45;
 $47 = ((($amtws)) + 88|0);
 HEAPF64[$47>>3] = -0.0;
 $48 = ((($amtws)) + 96|0);
 HEAPF64[$48>>3] = 0.0;
 $49 = ((($amtws)) + 104|0);
 HEAPF64[$49>>3] = 0.0;
 $50 = ((($amtws)) + 112|0);
 HEAPF64[$50>>3] = 0.0;
 $51 = ((($amtws)) + 120|0);
 HEAPF64[$51>>3] = 0.0;
 $52 = ((($amtws)) + 128|0);
 HEAPF64[$52>>3] = 0.0;
 $53 = ((($amtws)) + 136|0);
 HEAPF64[$53>>3] = 0.0;
 $54 = ((($amtws)) + 144|0);
 HEAPF64[$54>>3] = 0.0;
 $55 = ((($amtws)) + 152|0);
 HEAPF64[$55>>3] = 0.0;
 $56 = ((($amtws)) + 160|0);
 HEAPF64[$56>>3] = 0.0;
 $57 = ((($amtws)) + 168|0);
 HEAPF64[$57>>3] = 0.0;
 $58 = ((($amtws)) + 176|0);
 HEAPF64[$58>>3] = 0.0;
 $59 = ((($amtws)) + 184|0);
 HEAPF64[$59>>3] = 0.0;
 $60 = ((($amtws)) + 192|0);
 HEAPF64[$60>>3] = 0.0;
 $61 = ((($amtws)) + 200|0);
 HEAPF64[$61>>3] = -0.0;
 $62 = ((($amtws)) + 208|0);
 HEAPF64[$62>>3] = 0.0;
 $63 = ((($amtws)) + 216|0);
 HEAPF64[$63>>3] = 0.0;
 $j = 1;
 while(1) {
  $64 = $j;
  $65 = ($64|0)<=(27);
  if (!($65)) {
   break;
  }
  $66 = ((($amtws)) + 224|0);
  $67 = +HEAPF64[$66>>3];
  $68 = $j;
  $69 = (($amtws) + ($68<<3)|0);
  $70 = +HEAPF64[$69>>3];
  $71 = $67 + $70;
  $72 = ((($amtws)) + 224|0);
  HEAPF64[$72>>3] = $71;
  $73 = $j;
  $74 = (($73) + 1)|0;
  $j = $74;
 }
 $75 = HEAP32[56708>>2]|0;
 $76 = ($75|0)==(3);
 do {
  if ($76) {
   $77 = ((($amtws)) + 224|0);
   $78 = +HEAPF64[$77>>3];
   $79 = $78 > 415050.0;
   $80 = ((($amtws)) + 224|0);
   $81 = +HEAPF64[$80>>3];
   if ($79) {
    $82 = $81 + 41900.0;
    $83 = ((($amtws)) + 224|0);
    HEAPF64[$83>>3] = $82;
    break;
   }
   $84 = $81 > 247450.0;
   if ($84) {
    $85 = ((($amtws)) + 224|0);
    $86 = +HEAPF64[$85>>3];
    $87 = ((($amtws)) + 224|0);
    $88 = +HEAPF64[$87>>3];
    $89 = $88 - 247450.0;
    $90 = 0.25 * $89;
    $91 = $86 + $90;
    $92 = ((($amtws)) + 224|0);
    HEAPF64[$92>>3] = $91;
   }
  }
 } while(0);
 $93 = HEAP32[56708>>2]|0;
 L26: do {
  switch ($93|0) {
  case 4: case 1:  {
   $thresholdA = 119700.0;
   $thresholdB = 335300.0;
   $amtexmption = 53900.0;
   break;
  }
  case 5: case 2:  {
   $thresholdA = 159700.0;
   $thresholdB = 494900.0;
   $amtexmption = 83800.0;
   break;
  }
  case 3:  {
   $thresholdA = 79850.0;
   $thresholdB = 247450.0;
   $thresholdC = 93150.0;
   $offsetA = 1863.0;
   $amtexmption = 41900.0;
   $94 = ((($amtws)) + 232|0);
   $95 = +HEAPF64[$94>>3];
   $96 = $thresholdB;
   $97 = $95 > $96;
   if ($97) {
    $98 = ((($amtws)) + 232|0);
    $99 = +HEAPF64[$98>>3];
    $100 = $99 > 358800.0;
    $101 = ((($amtws)) + 232|0);
    $102 = +HEAPF64[$101>>3];
    if ($100) {
     $103 = $102 + 35475.0;
     $104 = ((($amtws)) + 232|0);
     HEAPF64[$104>>3] = $103;
     break L26;
    } else {
     $105 = ((($amtws)) + 232|0);
     $106 = +HEAPF64[$105>>3];
     $107 = $thresholdB;
     $108 = $106 - $107;
     $109 = 0.25 * $108;
     $110 = $102 + $109;
     $111 = ((($amtws)) + 232|0);
     HEAPF64[$111>>3] = $110;
     break L26;
    }
   }
   break;
  }
  default: {
   $112 = HEAP32[56708>>2]|0;
   HEAP32[$vararg_buffer8>>2] = $112;
   (_printf(58524,$vararg_buffer8)|0);
   _exit(1);
   // unreachable;
  }
  }
 } while(0);
 $113 = ((($amtws)) + 224|0);
 $114 = +HEAPF64[$113>>3];
 $115 = $thresholdA;
 $116 = $114 <= $115;
 do {
  if ($116) {
   $117 = $amtexmption;
   $118 = ((($amtws)) + 232|0);
   HEAPF64[$118>>3] = $117;
  } else {
   $119 = ((($amtws)) + 224|0);
   $120 = +HEAPF64[$119>>3];
   $121 = $thresholdB;
   $122 = $120 >= $121;
   if ($122) {
    $123 = ((($amtws)) + 232|0);
    HEAPF64[$123>>3] = 0.0;
    break;
   }
   $124 = $amtexmption;
   $125 = ((($ws)) + 8|0);
   HEAPF64[$125>>3] = $124;
   $126 = ((($amtws)) + 224|0);
   $127 = +HEAPF64[$126>>3];
   $128 = ((($ws)) + 16|0);
   HEAPF64[$128>>3] = $127;
   $129 = $thresholdA;
   $130 = ((($ws)) + 24|0);
   HEAPF64[$130>>3] = $129;
   $131 = ((($ws)) + 16|0);
   $132 = +HEAPF64[$131>>3];
   $133 = ((($ws)) + 24|0);
   $134 = +HEAPF64[$133>>3];
   $135 = $132 - $134;
   $136 = (+_NotLessThanZero($135));
   $137 = ((($ws)) + 32|0);
   HEAPF64[$137>>3] = $136;
   $138 = ((($ws)) + 32|0);
   $139 = +HEAPF64[$138>>3];
   $140 = 0.25 * $139;
   $141 = ((($ws)) + 40|0);
   HEAPF64[$141>>3] = $140;
   $142 = ((($ws)) + 8|0);
   $143 = +HEAPF64[$142>>3];
   $144 = ((($ws)) + 40|0);
   $145 = +HEAPF64[$144>>3];
   $146 = $143 - $145;
   $147 = (+_NotLessThanZero($146));
   $148 = ((($ws)) + 48|0);
   HEAPF64[$148>>3] = $147;
   $j = 0;
   while(1) {
    $149 = $j;
    $150 = ($149|0)<(10);
    if (!($150)) {
     break;
    }
    $151 = $j;
    $152 = (($ws) + ($151<<3)|0);
    $153 = +HEAPF64[$152>>3];
    $154 = $153 != 0.0;
    if ($154) {
     $155 = $j;
     $156 = $j;
     $157 = (($ws) + ($156<<3)|0);
     $158 = +HEAPF64[$157>>3];
     HEAP32[$vararg_buffer10>>2] = $155;
     $vararg_ptr13 = ((($vararg_buffer10)) + 8|0);
     HEAPF64[$vararg_ptr13>>3] = $158;
     (_printf(58548,$vararg_buffer10)|0);
     $159 = HEAP32[56672>>2]|0;
     $160 = $j;
     $161 = $j;
     $162 = (($ws) + ($161<<3)|0);
     $163 = +HEAPF64[$162>>3];
     HEAP32[$vararg_buffer14>>2] = $160;
     $vararg_ptr17 = ((($vararg_buffer14)) + 8|0);
     HEAPF64[$vararg_ptr17>>3] = $163;
     (_fprintf($159,58577,$vararg_buffer14)|0);
    }
    $164 = $j;
    $165 = (($164) + 1)|0;
    $j = $165;
   }
   $166 = ((($ws)) + 48|0);
   $167 = +HEAPF64[$166>>3];
   $168 = ((($amtws)) + 232|0);
   HEAPF64[$168>>3] = $167;
  }
 } while(0);
 $169 = ((($amtws)) + 224|0);
 $170 = +HEAPF64[$169>>3];
 $171 = ((($amtws)) + 232|0);
 $172 = +HEAPF64[$171>>3];
 $173 = $170 - $172;
 $174 = (+_NotLessThanZero($173));
 $175 = ((($amtws)) + 240|0);
 HEAPF64[$175>>3] = $174;
 $176 = ((($amtws)) + 240|0);
 $177 = +HEAPF64[$176>>3];
 $178 = $177 > 0.0;
 if ($178) {
  $179 = +HEAPF64[(112)>>3];
  $180 = $179 == 0.0;
  $181 = +HEAPF64[8016>>3];
  $182 = $181 == 0.0;
  $or$cond = $180 & $182;
  do {
   if ($or$cond) {
    $183 = +HEAPF64[(16760)>>3];
    $184 = $183 <= 0.0;
    $185 = +HEAPF64[(16768)>>3];
    $186 = $185 <= 0.0;
    $or$cond3 = $184 | $186;
    if ($or$cond3) {
     $187 = ((($amtws)) + 240|0);
     $188 = +HEAPF64[$187>>3];
     $189 = $thresholdC;
     $190 = $188 <= $189;
     $191 = ((($amtws)) + 240|0);
     $192 = +HEAPF64[$191>>3];
     if ($190) {
      $193 = 0.26000000000000001 * $192;
      $194 = ((($amtws)) + 248|0);
      HEAPF64[$194>>3] = $193;
      break;
     } else {
      $195 = 0.28000000000000003 * $192;
      $196 = $offsetA;
      $197 = $195 - $196;
      $198 = ((($amtws)) + 248|0);
      HEAPF64[$198>>3] = $197;
      break;
     }
    } else {
     label = 43;
    }
   } else {
    label = 43;
   }
  } while(0);
  if ((label|0) == 43) {
   $199 = ((($amtws)) + 240|0);
   $200 = +HEAPF64[$199>>3];
   $201 = ((($amtws)) + 288|0);
   HEAPF64[$201>>3] = $200;
   $202 = +HEAPF64[8024>>3];
   $203 = +HEAPF64[(32744)>>3];
   $204 = (+_largerof($202,$203));
   $205 = ((($amtws)) + 296|0);
   HEAPF64[$205>>3] = $204;
   $206 = +HEAPF64[(16792)>>3];
   $207 = ((($amtws)) + 304|0);
   HEAPF64[$207>>3] = $206;
   $208 = HEAP32[56696>>2]|0;
   $209 = ($208|0)!=(0);
   $210 = ((($amtws)) + 296|0);
   $211 = +HEAPF64[$210>>3];
   if ($209) {
    $212 = ((($amtws)) + 304|0);
    $213 = +HEAPF64[$212>>3];
    $214 = $211 + $213;
    $215 = +HEAPF64[(32720)>>3];
    $216 = (+_smallerof($214,$215));
    $217 = ((($amtws)) + 312|0);
    HEAPF64[$217>>3] = $216;
   } else {
    $218 = ((($amtws)) + 312|0);
    HEAPF64[$218>>3] = $211;
   }
   $219 = ((($amtws)) + 288|0);
   $220 = +HEAPF64[$219>>3];
   $221 = ((($amtws)) + 312|0);
   $222 = +HEAPF64[$221>>3];
   $223 = (+_smallerof($220,$222));
   $224 = ((($amtws)) + 320|0);
   HEAPF64[$224>>3] = $223;
   $225 = ((($amtws)) + 288|0);
   $226 = +HEAPF64[$225>>3];
   $227 = ((($amtws)) + 320|0);
   $228 = +HEAPF64[$227>>3];
   $229 = $226 - $228;
   $230 = ((($amtws)) + 328|0);
   HEAPF64[$230>>3] = $229;
   $231 = ((($amtws)) + 328|0);
   $232 = +HEAPF64[$231>>3];
   $233 = $thresholdC;
   $234 = $232 <= $233;
   $235 = ((($amtws)) + 328|0);
   $236 = +HEAPF64[$235>>3];
   if ($234) {
    $237 = 0.26000000000000001 * $236;
    $238 = ((($amtws)) + 336|0);
    HEAPF64[$238>>3] = $237;
   } else {
    $239 = 0.28000000000000003 * $236;
    $240 = $offsetA;
    $241 = $239 - $240;
    $242 = ((($amtws)) + 336|0);
    HEAPF64[$242>>3] = $241;
   }
   $243 = HEAP32[56708>>2]|0;
   switch ($243|0) {
   case 5: case 2:  {
    $244 = ((($amtws)) + 344|0);
    HEAPF64[$244>>3] = 75300.0;
    break;
   }
   case 3: case 1:  {
    $245 = ((($amtws)) + 344|0);
    HEAPF64[$245>>3] = 37650.0;
    break;
   }
   case 4:  {
    $246 = ((($amtws)) + 344|0);
    HEAPF64[$246>>3] = 50400.0;
    break;
   }
   default: {
   }
   }
   $247 = +HEAPF64[8032>>3];
   $248 = +HEAPF64[(32752)>>3];
   $249 = (+_largerof($247,$248));
   $250 = ((($amtws)) + 352|0);
   HEAPF64[$250>>3] = $249;
   $251 = ((($amtws)) + 344|0);
   $252 = +HEAPF64[$251>>3];
   $253 = ((($amtws)) + 352|0);
   $254 = +HEAPF64[$253>>3];
   $255 = $252 - $254;
   $256 = (+_NotLessThanZero($255));
   $257 = ((($amtws)) + 360|0);
   HEAPF64[$257>>3] = $256;
   $258 = ((($amtws)) + 288|0);
   $259 = +HEAPF64[$258>>3];
   $260 = ((($amtws)) + 296|0);
   $261 = +HEAPF64[$260>>3];
   $262 = (+_smallerof($259,$261));
   $263 = ((($amtws)) + 368|0);
   HEAPF64[$263>>3] = $262;
   $264 = ((($amtws)) + 360|0);
   $265 = +HEAPF64[$264>>3];
   $266 = ((($amtws)) + 368|0);
   $267 = +HEAPF64[$266>>3];
   $268 = (+_smallerof($265,$267));
   $269 = ((($amtws)) + 376|0);
   HEAPF64[$269>>3] = $268;
   $270 = ((($amtws)) + 368|0);
   $271 = +HEAPF64[$270>>3];
   $272 = ((($amtws)) + 376|0);
   $273 = +HEAPF64[$272>>3];
   $274 = $271 - $273;
   $275 = ((($amtws)) + 384|0);
   HEAPF64[$275>>3] = $274;
   $276 = HEAP32[56708>>2]|0;
   switch ($276|0) {
   case 1:  {
    $277 = ((($amtws)) + 392|0);
    HEAPF64[$277>>3] = 415050.0;
    break;
   }
   case 3:  {
    $278 = ((($amtws)) + 392|0);
    HEAPF64[$278>>3] = 233475.0;
    break;
   }
   case 5: case 2:  {
    $279 = ((($amtws)) + 392|0);
    HEAPF64[$279>>3] = 466950.0;
    break;
   }
   case 4:  {
    $280 = ((($amtws)) + 392|0);
    HEAPF64[$280>>3] = 441000.0;
    break;
   }
   default: {
    $281 = HEAP32[56708>>2]|0;
    HEAP32[$vararg_buffer18>>2] = $281;
    (_printf(58524,$vararg_buffer18)|0);
    _exit(1);
    // unreachable;
   }
   }
   $282 = ((($amtws)) + 360|0);
   $283 = +HEAPF64[$282>>3];
   $284 = ((($amtws)) + 400|0);
   HEAPF64[$284>>3] = $283;
   $285 = +HEAPF64[8032>>3];
   $286 = $285 != 0.0;
   $287 = +HEAPF64[(32792)>>3];
   $288 = $287 != 0.0;
   $or$cond5 = $286 | $288;
   if ($or$cond5) {
    $289 = +HEAPF64[8032>>3];
    $290 = +HEAPF64[(32792)>>3];
    $291 = (+_largerof($289,$290));
    $292 = (+_NotLessThanZero($291));
    $293 = ((($amtws)) + 408|0);
    HEAPF64[$293>>3] = $292;
   } else {
    $294 = +HEAPF64[(352)>>3];
    $295 = (+_NotLessThanZero($294));
    $296 = ((($amtws)) + 408|0);
    HEAPF64[$296>>3] = $295;
   }
   $297 = ((($amtws)) + 400|0);
   $298 = +HEAPF64[$297>>3];
   $299 = ((($amtws)) + 408|0);
   $300 = +HEAPF64[$299>>3];
   $301 = $298 + $300;
   $302 = ((($amtws)) + 416|0);
   HEAPF64[$302>>3] = $301;
   $303 = ((($amtws)) + 392|0);
   $304 = +HEAPF64[$303>>3];
   $305 = ((($amtws)) + 416|0);
   $306 = +HEAPF64[$305>>3];
   $307 = $304 - $306;
   $308 = (+_NotLessThanZero($307));
   $309 = ((($amtws)) + 424|0);
   HEAPF64[$309>>3] = $308;
   $310 = ((($amtws)) + 384|0);
   $311 = +HEAPF64[$310>>3];
   $312 = ((($amtws)) + 424|0);
   $313 = +HEAPF64[$312>>3];
   $314 = (+_smallerof($311,$313));
   $315 = ((($amtws)) + 432|0);
   HEAPF64[$315>>3] = $314;
   $316 = ((($amtws)) + 432|0);
   $317 = +HEAPF64[$316>>3];
   $318 = 0.14999999999999999 * $317;
   $319 = ((($amtws)) + 440|0);
   HEAPF64[$319>>3] = $318;
   $320 = ((($amtws)) + 376|0);
   $321 = +HEAPF64[$320>>3];
   $322 = ((($amtws)) + 432|0);
   $323 = +HEAPF64[$322>>3];
   $324 = $321 + $323;
   $325 = ((($amtws)) + 448|0);
   HEAPF64[$325>>3] = $324;
   $326 = ((($amtws)) + 288|0);
   $327 = +HEAPF64[$326>>3];
   $328 = ((($amtws)) + 448|0);
   $329 = +HEAPF64[$328>>3];
   $330 = $327 - $329;
   $331 = (+_absolutev($330));
   $332 = $331 > 0.0050000000000000001;
   if ($332) {
    $333 = ((($amtws)) + 368|0);
    $334 = +HEAPF64[$333>>3];
    $335 = ((($amtws)) + 448|0);
    $336 = +HEAPF64[$335>>3];
    $337 = $334 - $336;
    $338 = ((($amtws)) + 456|0);
    HEAPF64[$338>>3] = $337;
    $339 = ((($amtws)) + 456|0);
    $340 = +HEAPF64[$339>>3];
    $341 = 0.20000000000000001 * $340;
    $342 = ((($amtws)) + 464|0);
    HEAPF64[$342>>3] = $341;
    $343 = ((($amtws)) + 304|0);
    $344 = +HEAPF64[$343>>3];
    $345 = $344 != 0.0;
    if ($345) {
     $346 = ((($amtws)) + 328|0);
     $347 = +HEAPF64[$346>>3];
     $348 = ((($amtws)) + 448|0);
     $349 = +HEAPF64[$348>>3];
     $350 = $347 + $349;
     $351 = ((($amtws)) + 456|0);
     $352 = +HEAPF64[$351>>3];
     $353 = $350 + $352;
     $354 = ((($amtws)) + 472|0);
     HEAPF64[$354>>3] = $353;
     $355 = ((($amtws)) + 288|0);
     $356 = +HEAPF64[$355>>3];
     $357 = ((($amtws)) + 472|0);
     $358 = +HEAPF64[$357>>3];
     $359 = $356 - $358;
     $360 = ((($amtws)) + 480|0);
     HEAPF64[$360>>3] = $359;
     $361 = ((($amtws)) + 480|0);
     $362 = +HEAPF64[$361>>3];
     $363 = 0.25 * $362;
     $364 = ((($amtws)) + 488|0);
     HEAPF64[$364>>3] = $363;
    }
   }
   $365 = ((($amtws)) + 336|0);
   $366 = +HEAPF64[$365>>3];
   $367 = ((($amtws)) + 440|0);
   $368 = +HEAPF64[$367>>3];
   $369 = $366 + $368;
   $370 = ((($amtws)) + 464|0);
   $371 = +HEAPF64[$370>>3];
   $372 = $369 + $371;
   $373 = ((($amtws)) + 488|0);
   $374 = +HEAPF64[$373>>3];
   $375 = $372 + $374;
   $376 = ((($amtws)) + 496|0);
   HEAPF64[$376>>3] = $375;
   $377 = ((($amtws)) + 288|0);
   $378 = +HEAPF64[$377>>3];
   $379 = $thresholdC;
   $380 = $378 <= $379;
   $381 = ((($amtws)) + 288|0);
   $382 = +HEAPF64[$381>>3];
   if ($380) {
    $383 = 0.26000000000000001 * $382;
    $384 = ((($amtws)) + 504|0);
    HEAPF64[$384>>3] = $383;
   } else {
    $385 = 0.28000000000000003 * $382;
    $386 = $offsetA;
    $387 = $385 - $386;
    $388 = ((($amtws)) + 504|0);
    HEAPF64[$388>>3] = $387;
   }
   $389 = ((($amtws)) + 496|0);
   $390 = +HEAPF64[$389>>3];
   $391 = ((($amtws)) + 504|0);
   $392 = +HEAPF64[$391>>3];
   $393 = (+_smallerof($390,$392));
   $394 = ((($amtws)) + 512|0);
   HEAPF64[$394>>3] = $393;
   $395 = ((($amtws)) + 512|0);
   $396 = +HEAPF64[$395>>3];
   $397 = ((($amtws)) + 248|0);
   HEAPF64[$397>>3] = $396;
  }
  $398 = +HEAPF64[(392)>>3];
  $399 = ((($amtws)) + 256|0);
  HEAPF64[$399>>3] = $398;
  $400 = ((($amtws)) + 248|0);
  $401 = +HEAPF64[$400>>3];
  $402 = ((($amtws)) + 256|0);
  $403 = +HEAPF64[$402>>3];
  $404 = $401 - $403;
  $405 = ((($amtws)) + 264|0);
  HEAPF64[$405>>3] = $404;
 }
 $406 = +HEAPF64[(360)>>3];
 $407 = +HEAPF64[(376)>>3];
 $408 = $406 + $407;
 $409 = +HEAPF64[(392)>>3];
 $410 = $408 - $409;
 $411 = ((($amtws)) + 272|0);
 HEAPF64[$411>>3] = $410;
 $412 = ((($amtws)) + 264|0);
 $413 = +HEAPF64[$412>>3];
 $414 = ((($amtws)) + 272|0);
 $415 = +HEAPF64[$414>>3];
 $416 = $413 - $415;
 $417 = (+_NotLessThanZero($416));
 $418 = ((($amtws)) + 280|0);
 HEAPF64[$418>>3] = $417;
 $419 = ((($amtws)) + 248|0);
 $420 = +HEAPF64[$419>>3];
 $421 = ((($amtws)) + 272|0);
 $422 = +HEAPF64[$421>>3];
 $423 = $420 > $422;
 if ($423) {
  $424 = HEAP32[56672>>2]|0;
  $425 = ((($amtws)) + 248|0);
  $426 = +HEAPF64[$425>>3];
  $427 = ((($amtws)) + 272|0);
  $428 = +HEAPF64[$427>>3];
  HEAPF64[$vararg_buffer21>>3] = $426;
  $vararg_ptr24 = ((($vararg_buffer21)) + 8|0);
  HEAPF64[$vararg_ptr24>>3] = $428;
  (_fprintf($424,58606,$vararg_buffer21)|0);
 } else {
  $j = 8;
  while(1) {
   $429 = $j;
   $430 = ($429|0)<(27);
   if (!($430)) {
    break;
   }
   $431 = $sum8_27;
   $432 = $j;
   $433 = (($amtws) + ($432<<3)|0);
   $434 = +HEAPF64[$433>>3];
   $435 = $431 + $434;
   $sum8_27 = $435;
   $436 = $j;
   $437 = (($436) + 1)|0;
   $j = $437;
  }
  $438 = HEAP32[56672>>2]|0;
  $439 = $sum8_27;
  HEAPF64[$vararg_buffer25>>3] = $439;
  (_fprintf($438,58646,$vararg_buffer25)|0);
  $440 = $sum8_27;
  $441 = $440 < 0.0;
  if ($441) {
   $442 = HEAP32[56672>>2]|0;
   $443 = ((($amtws)) + 248|0);
   $444 = +HEAPF64[$443>>3];
   $445 = ((($amtws)) + 272|0);
   $446 = +HEAPF64[$445>>3];
   HEAPF64[$vararg_buffer28>>3] = $444;
   $vararg_ptr31 = ((($vararg_buffer28)) + 8|0);
   HEAPF64[$vararg_ptr31>>3] = $446;
   (_fprintf($442,58692,$vararg_buffer28)|0);
   $447 = HEAP32[56672>>2]|0;
   (_fprintf($447,58781,$vararg_buffer32)|0);
  }
 }
 $j = 0;
 while(1) {
  $448 = $j;
  $449 = ($448|0)<(100);
  if (!($449)) {
   break;
  }
  $450 = $j;
  $451 = ($450|0)==(35);
  if ($451) {
   label = 81;
  } else {
   $452 = $j;
   $453 = (($amtws) + ($452<<3)|0);
   $454 = +HEAPF64[$453>>3];
   $455 = $454 != 0.0;
   if ($455) {
    label = 81;
   }
  }
  if ((label|0) == 81) {
   label = 0;
   $456 = $j;
   $457 = $j;
   $458 = (($amtws) + ($457<<3)|0);
   $459 = +HEAPF64[$458>>3];
   HEAP32[$vararg_buffer34>>2] = $456;
   $vararg_ptr37 = ((($vararg_buffer34)) + 8|0);
   HEAPF64[$vararg_ptr37>>3] = $459;
   (_printf(58846,$vararg_buffer34)|0);
   $460 = HEAP32[56672>>2]|0;
   $461 = $j;
   $462 = $j;
   $463 = (($amtws) + ($462<<3)|0);
   $464 = +HEAPF64[$463>>3];
   HEAP32[$vararg_buffer38>>2] = $461;
   $vararg_ptr41 = ((($vararg_buffer38)) + 8|0);
   HEAPF64[$vararg_ptr41>>3] = $464;
   (_fprintf($460,58846,$vararg_buffer38)|0);
  }
  $465 = $j;
  $466 = (($465) + 1)|0;
  $j = $466;
 }
 $467 = HEAP32[56672>>2]|0;
 $468 = ((($amtws)) + 280|0);
 $469 = +HEAPF64[$468>>3];
 HEAPF64[$vararg_buffer42>>3] = $469;
 (_fprintf($467,58877,$vararg_buffer42)|0);
 $470 = ((($amtws)) + 280|0);
 $471 = +HEAPF64[$470>>3];
 HEAPF64[$vararg_buffer45>>3] = $471;
 (_printf(58877,$vararg_buffer45)|0);
 $472 = ((($amtws)) + 280|0);
 $473 = +HEAPF64[$472>>3];
 STACKTOP = sp;return (+$473);
}
function _convert_slashes($fname) {
 $fname = $fname|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $ptr = 0, $slash_replace = 0, $slash_sreach = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $fname;
 $slash_sreach = 92;
 $slash_replace = 47;
 $1 = $0;
 $2 = $slash_sreach;
 $3 = $2 << 24 >> 24;
 $4 = (_strchr($1,$3)|0);
 $ptr = $4;
 while(1) {
  $5 = $ptr;
  $6 = ($5|0)!=(0|0);
  if (!($6)) {
   break;
  }
  $7 = $slash_replace;
  $8 = $ptr;
  HEAP8[$8>>0] = $7;
  $9 = $0;
  $10 = $slash_sreach;
  $11 = $10 << 24 >> 24;
  $12 = (_strchr($9,$11)|0);
  $ptr = $12;
 }
 STACKTOP = sp;return;
}
function _ImportFederalReturnData($fedlogfile,$fed_data) {
 $fedlogfile = $fedlogfile|0;
 $fed_data = $fed_data|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0.0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0.0, $85 = 0, $86 = 0, $9 = 0, $fline = 0, $infile = 0, $linenum = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer10 = 0, $vararg_buffer14 = 0, $vararg_buffer17 = 0, $vararg_buffer22 = 0, $vararg_buffer26 = 0, $vararg_buffer29 = 0, $vararg_buffer33 = 0, $vararg_buffer36 = 0;
 var $vararg_buffer4 = 0, $vararg_buffer41 = 0, $vararg_buffer7 = 0, $vararg_ptr13 = 0, $vararg_ptr20 = 0, $vararg_ptr21 = 0, $vararg_ptr25 = 0, $vararg_ptr32 = 0, $vararg_ptr39 = 0, $vararg_ptr40 = 0, $vararg_ptr44 = 0, $word = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 2160|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer41 = sp + 120|0;
 $vararg_buffer36 = sp + 104|0;
 $vararg_buffer33 = sp + 96|0;
 $vararg_buffer29 = sp + 88|0;
 $vararg_buffer26 = sp + 80|0;
 $vararg_buffer22 = sp + 64|0;
 $vararg_buffer17 = sp + 48|0;
 $vararg_buffer14 = sp + 40|0;
 $vararg_buffer10 = sp + 32|0;
 $vararg_buffer7 = sp + 24|0;
 $vararg_buffer4 = sp + 16|0;
 $vararg_buffer1 = sp + 8|0;
 $vararg_buffer = sp;
 $fline = sp + 1152|0;
 $word = sp + 152|0;
 $linenum = sp + 136|0;
 $0 = $fedlogfile;
 $1 = $fed_data;
 HEAP32[$linenum>>2] = 0;
 while(1) {
  $2 = HEAP32[$linenum>>2]|0;
  $3 = ($2|0)<(1000);
  if (!($3)) {
   break;
  }
  $4 = HEAP32[$linenum>>2]|0;
  $5 = $1;
  $6 = (($5) + ($4<<3)|0);
  HEAPF64[$6>>3] = 0.0;
  $7 = HEAP32[$linenum>>2]|0;
  $8 = $1;
  $9 = ((($8)) + 8000|0);
  $10 = (($9) + ($7<<3)|0);
  HEAPF64[$10>>3] = 0.0;
  $11 = HEAP32[$linenum>>2]|0;
  $12 = (($11) + 1)|0;
  HEAP32[$linenum>>2] = $12;
 }
 $13 = $0;
 _convert_slashes($13);
 $14 = $0;
 $15 = (_fopen($14,58162)|0);
 $infile = $15;
 $16 = $infile;
 $17 = ($16|0)==(0|0);
 $18 = $0;
 if ($17) {
  HEAP32[$vararg_buffer>>2] = $18;
  (_printf(58915,$vararg_buffer)|0);
  $19 = HEAP32[56672>>2]|0;
  $20 = $0;
  HEAP32[$vararg_buffer1>>2] = $20;
  (_fprintf($19,58915,$vararg_buffer1)|0);
  _exit(1);
  // unreachable;
 }
 HEAP32[$vararg_buffer4>>2] = $18;
 (_printf(58958,$vararg_buffer4)|0);
 $21 = $1;
 $22 = ((($21)) + 16004|0);
 HEAP32[$22>>2] = 1;
 $23 = $infile;
 _read_line($23,$fline);
 HEAP32[$linenum>>2] = 0;
 while(1) {
  $24 = $infile;
  $25 = (_feof($24)|0);
  $26 = ($25|0)!=(0);
  $27 = $26 ^ 1;
  if (!($27)) {
   break;
  }
  $28 = (_strstr($fline,59016)|0);
  $29 = ($28|0)!=(0|0);
  if ($29) {
   $30 = $1;
   $31 = ((($30)) + 16004|0);
   HEAP32[$31>>2] = 0;
  }
  _next_word($fline,$word,59040);
  $32 = (_strstr($word,59044)|0);
  $33 = ($32|0)==($word|0);
  if ($33) {
   $34 = (_strstr($fline,59046)|0);
   $35 = ($34|0)!=(0|0);
   if ($35) {
    $36 = ((($word)) + 1|0);
    HEAP32[$vararg_buffer7>>2] = $linenum;
    $37 = (_sscanf($36,57789,$vararg_buffer7)|0);
    $38 = ($37|0)!=(1);
    if ($38) {
     HEAP32[$vararg_buffer10>>2] = $word;
     $vararg_ptr13 = ((($vararg_buffer10)) + 4|0);
     HEAP32[$vararg_ptr13>>2] = $fline;
     (_printf(59050,$vararg_buffer10)|0);
    }
    _next_word($fline,$word,59040);
    $39 = HEAP32[$linenum>>2]|0;
    $40 = $1;
    $41 = (($40) + ($39<<3)|0);
    HEAP32[$vararg_buffer14>>2] = $41;
    $42 = (_sscanf($word,59089,$vararg_buffer14)|0);
    $43 = ($42|0)!=(1);
    if ($43) {
     $44 = HEAP32[$linenum>>2]|0;
     HEAP32[$vararg_buffer17>>2] = $44;
     $vararg_ptr20 = ((($vararg_buffer17)) + 4|0);
     HEAP32[$vararg_ptr20>>2] = $word;
     $vararg_ptr21 = ((($vararg_buffer17)) + 8|0);
     HEAP32[$vararg_ptr21>>2] = $fline;
     (_printf(59093,$vararg_buffer17)|0);
    }
    $45 = HEAP32[56676>>2]|0;
    $46 = ($45|0)!=(0);
    if ($46) {
     $47 = HEAP32[$linenum>>2]|0;
     $48 = HEAP32[$linenum>>2]|0;
     $49 = $1;
     $50 = (($49) + ($48<<3)|0);
     $51 = +HEAPF64[$50>>3];
     HEAP32[$vararg_buffer22>>2] = $47;
     $vararg_ptr25 = ((($vararg_buffer22)) + 8|0);
     HEAPF64[$vararg_ptr25>>3] = $51;
     (_printf(59128,$vararg_buffer22)|0);
    }
   }
  }
  $52 = (_strstr($word,59148)|0);
  $53 = ($52|0)==($word|0);
  if ($53) {
   $54 = (_strstr($fline,59046)|0);
   $55 = ($54|0)!=(0|0);
   if ($55) {
    $56 = ((($word)) + 1|0);
    HEAP32[$vararg_buffer26>>2] = $linenum;
    $57 = (_sscanf($56,57789,$vararg_buffer26)|0);
    $58 = ($57|0)!=(1);
    if ($58) {
     HEAP32[$vararg_buffer29>>2] = $word;
     $vararg_ptr32 = ((($vararg_buffer29)) + 4|0);
     HEAP32[$vararg_ptr32>>2] = $fline;
     (_printf(59050,$vararg_buffer29)|0);
    }
    _next_word($fline,$word,59040);
    $59 = HEAP32[$linenum>>2]|0;
    $60 = $1;
    $61 = ((($60)) + 8000|0);
    $62 = (($61) + ($59<<3)|0);
    HEAP32[$vararg_buffer33>>2] = $62;
    $63 = (_sscanf($word,59089,$vararg_buffer33)|0);
    $64 = ($63|0)!=(1);
    do {
     if ($64) {
      $65 = (_strcasecmp($word,59150)|0);
      $66 = ($65|0)==(0);
      if ($66) {
       $67 = HEAP32[$linenum>>2]|0;
       $68 = $1;
       $69 = ((($68)) + 8000|0);
       $70 = (($69) + ($67<<3)|0);
       HEAPF64[$70>>3] = 1.0;
       break;
      }
      $71 = (_strcasecmp($word,59154)|0);
      $72 = ($71|0)==(0);
      $73 = HEAP32[$linenum>>2]|0;
      if ($72) {
       $74 = $1;
       $75 = ((($74)) + 8000|0);
       $76 = (($75) + ($73<<3)|0);
       HEAPF64[$76>>3] = 0.0;
       break;
      } else {
       HEAP32[$vararg_buffer36>>2] = $73;
       $vararg_ptr39 = ((($vararg_buffer36)) + 4|0);
       HEAP32[$vararg_ptr39>>2] = $word;
       $vararg_ptr40 = ((($vararg_buffer36)) + 8|0);
       HEAP32[$vararg_ptr40>>2] = $fline;
       (_printf(59157,$vararg_buffer36)|0);
       break;
      }
     }
    } while(0);
    $77 = HEAP32[56676>>2]|0;
    $78 = ($77|0)!=(0);
    if ($78) {
     $79 = HEAP32[$linenum>>2]|0;
     $80 = HEAP32[$linenum>>2]|0;
     $81 = $1;
     $82 = ((($81)) + 8000|0);
     $83 = (($82) + ($80<<3)|0);
     $84 = +HEAPF64[$83>>3];
     HEAP32[$vararg_buffer41>>2] = $79;
     $vararg_ptr44 = ((($vararg_buffer41)) + 8|0);
     HEAPF64[$vararg_ptr44>>3] = $84;
     (_printf(59128,$vararg_buffer41)|0);
    }
   }
  }
  $85 = $infile;
  _read_line($85,$fline);
 }
 $86 = $infile;
 (_fclose($86)|0);
 STACKTOP = sp;return;
}
function _CapitalLossCarryOverWorksheet($fedlogfile,$LastYearsReturn) {
 $fedlogfile = $fedlogfile|0;
 $LastYearsReturn = $LastYearsReturn|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0.0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0.0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0.0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0.0, $118 = 0, $119 = 0, $12 = 0.0, $120 = 0, $121 = 0, $122 = 0.0, $123 = 0.0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0.0, $129 = 0.0, $13 = 0.0, $130 = 0, $131 = 0, $132 = 0.0, $133 = 0;
 var $134 = 0.0, $135 = 0.0, $136 = 0.0, $137 = 0, $138 = 0, $139 = 0.0, $14 = 0, $140 = 0, $141 = 0.0, $142 = 0.0, $143 = 0, $144 = 0, $145 = 0.0, $146 = 0, $147 = 0.0, $148 = 0.0, $149 = 0.0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0.0, $153 = 0, $154 = 0, $155 = 0.0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0.0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0.0, $167 = 0, $168 = 0, $17 = 0.0, $18 = 0.0;
 var $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0.0, $33 = 0, $34 = 0, $35 = 0, $36 = 0;
 var $37 = 0.0, $38 = 0.0, $39 = 0, $4 = 0, $40 = 0, $41 = 0.0, $42 = 0, $43 = 0.0, $44 = 0.0, $45 = 0.0, $46 = 0, $47 = 0, $48 = 0.0, $49 = 0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0, $53 = 0, $54 = 0;
 var $55 = 0, $56 = 0, $57 = 0, $58 = 0.0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0.0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0.0, $7 = 0.0, $70 = 0, $71 = 0, $72 = 0;
 var $73 = 0, $74 = 0.0, $75 = 0.0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0.0, $81 = 0.0, $82 = 0, $83 = 0, $84 = 0.0, $85 = 0, $86 = 0.0, $87 = 0.0, $88 = 0, $89 = 0, $9 = 0, $90 = 0.0;
 var $91 = 0, $92 = 0.0, $93 = 0.0, $94 = 0.0, $95 = 0, $96 = 0, $97 = 0.0, $98 = 0, $99 = 0, $k = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer10 = 0, $vararg_buffer14 = 0, $vararg_buffer18 = 0, $vararg_buffer20 = 0, $vararg_buffer24 = 0, $vararg_buffer28 = 0, $vararg_buffer3 = 0, $vararg_buffer6 = 0;
 var $vararg_ptr13 = 0, $vararg_ptr17 = 0, $vararg_ptr23 = 0, $vararg_ptr27 = 0, $vararg_ptr5 = 0, $vararg_ptr9 = 0, $ws = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 544|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer28 = sp + 520|0;
 $vararg_buffer24 = sp + 504|0;
 $vararg_buffer20 = sp + 488|0;
 $vararg_buffer18 = sp + 480|0;
 $vararg_buffer14 = sp + 464|0;
 $vararg_buffer10 = sp + 448|0;
 $vararg_buffer6 = sp + 432|0;
 $vararg_buffer3 = sp + 416|0;
 $vararg_buffer1 = sp + 408|0;
 $vararg_buffer = sp + 400|0;
 $ws = sp;
 $0 = $fedlogfile;
 $1 = $LastYearsReturn;
 $2 = $0;
 $3 = $1;
 _ImportFederalReturnData($2,$3);
 $4 = $1;
 $5 = ((($4)) + 8000|0);
 $6 = ((($5)) + 168|0);
 $7 = +HEAPF64[$6>>3];
 $8 = $7 == 0.0;
 if ($8) {
  (_printf(59194,$vararg_buffer)|0);
  STACKTOP = sp;return;
 }
 $9 = $1;
 $10 = ((($9)) + 8000|0);
 $11 = ((($10)) + 168|0);
 $12 = +HEAPF64[$11>>3];
 $13 = (+_absolutev($12));
 $14 = $1;
 $15 = ((($14)) + 8000|0);
 $16 = ((($15)) + 128|0);
 $17 = +HEAPF64[$16>>3];
 $18 = (+_absolutev($17));
 $19 = $13 >= $18;
 if ($19) {
  $20 = $1;
  $21 = ((($20)) + 328|0);
  $22 = +HEAPF64[$21>>3];
  $23 = $22 >= 0.0;
  if ($23) {
   (_printf(59194,$vararg_buffer1)|0);
   STACKTOP = sp;return;
  }
 }
 $k = 0;
 while(1) {
  $24 = $k;
  $25 = ($24|0)<(50);
  if (!($25)) {
   break;
  }
  $26 = $k;
  $27 = (($ws) + ($26<<3)|0);
  HEAPF64[$27>>3] = 0.0;
  $28 = $k;
  $29 = (($28) + 1)|0;
  $k = $29;
 }
 $30 = $1;
 $31 = ((($30)) + 328|0);
 $32 = +HEAPF64[$31>>3];
 $33 = ((($ws)) + 8|0);
 HEAPF64[$33>>3] = $32;
 $34 = $1;
 $35 = ((($34)) + 8000|0);
 $36 = ((($35)) + 168|0);
 $37 = +HEAPF64[$36>>3];
 $38 = (+_absolutev($37));
 $39 = ((($ws)) + 16|0);
 HEAPF64[$39>>3] = $38;
 $40 = ((($ws)) + 8|0);
 $41 = +HEAPF64[$40>>3];
 $42 = ((($ws)) + 16|0);
 $43 = +HEAPF64[$42>>3];
 $44 = $41 + $43;
 $45 = (+_NotLessThanZero($44));
 $46 = ((($ws)) + 24|0);
 HEAPF64[$46>>3] = $45;
 $47 = ((($ws)) + 16|0);
 $48 = +HEAPF64[$47>>3];
 $49 = ((($ws)) + 24|0);
 $50 = +HEAPF64[$49>>3];
 $51 = (+_smallerof($48,$50));
 $52 = ((($ws)) + 32|0);
 HEAPF64[$52>>3] = $51;
 $k = 1;
 while(1) {
  $53 = $k;
  $54 = ($53|0)<=(4);
  if (!($54)) {
   break;
  }
  $55 = $k;
  $56 = $k;
  $57 = (($ws) + ($56<<3)|0);
  $58 = +HEAPF64[$57>>3];
  HEAP32[$vararg_buffer3>>2] = $55;
  $vararg_ptr5 = ((($vararg_buffer3)) + 8|0);
  HEAPF64[$vararg_ptr5>>3] = $58;
  (_printf(59216,$vararg_buffer3)|0);
  $59 = HEAP32[56672>>2]|0;
  $60 = $k;
  $61 = $k;
  $62 = (($ws) + ($61<<3)|0);
  $63 = +HEAPF64[$62>>3];
  HEAP32[$vararg_buffer6>>2] = $60;
  $vararg_ptr9 = ((($vararg_buffer6)) + 8|0);
  HEAPF64[$vararg_ptr9>>3] = $63;
  (_fprintf($59,59216,$vararg_buffer6)|0);
  $64 = $k;
  $65 = (($64) + 1)|0;
  $k = $65;
 }
 $66 = $1;
 $67 = ((($66)) + 8000|0);
 $68 = ((($67)) + 56|0);
 $69 = +HEAPF64[$68>>3];
 $70 = $69 < 0.0;
 L18: do {
  if ($70) {
   $71 = $1;
   $72 = ((($71)) + 8000|0);
   $73 = ((($72)) + 56|0);
   $74 = +HEAPF64[$73>>3];
   $75 = -$74;
   $76 = ((($ws)) + 40|0);
   HEAPF64[$76>>3] = $75;
   $77 = $1;
   $78 = ((($77)) + 8000|0);
   $79 = ((($78)) + 120|0);
   $80 = +HEAPF64[$79>>3];
   $81 = (+_NotLessThanZero($80));
   $82 = ((($ws)) + 48|0);
   HEAPF64[$82>>3] = $81;
   $83 = ((($ws)) + 32|0);
   $84 = +HEAPF64[$83>>3];
   $85 = ((($ws)) + 48|0);
   $86 = +HEAPF64[$85>>3];
   $87 = $84 + $86;
   $88 = ((($ws)) + 56|0);
   HEAPF64[$88>>3] = $87;
   $89 = ((($ws)) + 40|0);
   $90 = +HEAPF64[$89>>3];
   $91 = ((($ws)) + 56|0);
   $92 = +HEAPF64[$91>>3];
   $93 = $90 - $92;
   $94 = (+_NotLessThanZero($93));
   $95 = ((($ws)) + 64|0);
   HEAPF64[$95>>3] = $94;
   $96 = ((($ws)) + 64|0);
   $97 = +HEAPF64[$96>>3];
   $98 = $97 > 0.0;
   if ($98) {
    $99 = ((($ws)) + 64|0);
    $100 = +HEAPF64[$99>>3];
    HEAPF64[(16688)>>3] = $100;
   }
   $k = 5;
   while(1) {
    $101 = $k;
    $102 = ($101|0)<=(8);
    if (!($102)) {
     break L18;
    }
    $103 = $k;
    $104 = $k;
    $105 = (($ws) + ($104<<3)|0);
    $106 = +HEAPF64[$105>>3];
    HEAP32[$vararg_buffer10>>2] = $103;
    $vararg_ptr13 = ((($vararg_buffer10)) + 8|0);
    HEAPF64[$vararg_ptr13>>3] = $106;
    (_printf(59216,$vararg_buffer10)|0);
    $107 = HEAP32[56672>>2]|0;
    $108 = $k;
    $109 = $k;
    $110 = (($ws) + ($109<<3)|0);
    $111 = +HEAPF64[$110>>3];
    HEAP32[$vararg_buffer14>>2] = $108;
    $vararg_ptr17 = ((($vararg_buffer14)) + 8|0);
    HEAPF64[$vararg_ptr17>>3] = $111;
    (_fprintf($107,59216,$vararg_buffer14)|0);
    $112 = $k;
    $113 = (($112) + 1)|0;
    $k = $113;
   }
  } else {
   (_printf(59240,$vararg_buffer18)|0);
  }
 } while(0);
 $114 = $1;
 $115 = ((($114)) + 8000|0);
 $116 = ((($115)) + 120|0);
 $117 = +HEAPF64[$116>>3];
 $118 = $117 < 0.0;
 if (!($118)) {
  (_printf(59272,$vararg_buffer28)|0);
  STACKTOP = sp;return;
 }
 $119 = $1;
 $120 = ((($119)) + 8000|0);
 $121 = ((($120)) + 120|0);
 $122 = +HEAPF64[$121>>3];
 $123 = (+_absolutev($122));
 $124 = ((($ws)) + 72|0);
 HEAPF64[$124>>3] = $123;
 $125 = $1;
 $126 = ((($125)) + 8000|0);
 $127 = ((($126)) + 56|0);
 $128 = +HEAPF64[$127>>3];
 $129 = (+_NotLessThanZero($128));
 $130 = ((($ws)) + 80|0);
 HEAPF64[$130>>3] = $129;
 $131 = ((($ws)) + 32|0);
 $132 = +HEAPF64[$131>>3];
 $133 = ((($ws)) + 40|0);
 $134 = +HEAPF64[$133>>3];
 $135 = $132 - $134;
 $136 = (+_NotLessThanZero($135));
 $137 = ((($ws)) + 88|0);
 HEAPF64[$137>>3] = $136;
 $138 = ((($ws)) + 80|0);
 $139 = +HEAPF64[$138>>3];
 $140 = ((($ws)) + 88|0);
 $141 = +HEAPF64[$140>>3];
 $142 = $139 + $141;
 $143 = ((($ws)) + 96|0);
 HEAPF64[$143>>3] = $142;
 $144 = ((($ws)) + 72|0);
 $145 = +HEAPF64[$144>>3];
 $146 = ((($ws)) + 96|0);
 $147 = +HEAPF64[$146>>3];
 $148 = $145 - $147;
 $149 = (+_NotLessThanZero($148));
 $150 = ((($ws)) + 104|0);
 HEAPF64[$150>>3] = $149;
 $151 = ((($ws)) + 104|0);
 $152 = +HEAPF64[$151>>3];
 $153 = $152 > 0.0;
 if ($153) {
  $154 = ((($ws)) + 104|0);
  $155 = +HEAPF64[$154>>3];
  HEAPF64[(16752)>>3] = $155;
 }
 $k = 9;
 while(1) {
  $156 = $k;
  $157 = ($156|0)<=(13);
  if (!($157)) {
   break;
  }
  $158 = $k;
  $159 = $k;
  $160 = (($ws) + ($159<<3)|0);
  $161 = +HEAPF64[$160>>3];
  HEAP32[$vararg_buffer20>>2] = $158;
  $vararg_ptr23 = ((($vararg_buffer20)) + 8|0);
  HEAPF64[$vararg_ptr23>>3] = $161;
  (_printf(59216,$vararg_buffer20)|0);
  $162 = HEAP32[56672>>2]|0;
  $163 = $k;
  $164 = $k;
  $165 = (($ws) + ($164<<3)|0);
  $166 = +HEAPF64[$165>>3];
  HEAP32[$vararg_buffer24>>2] = $163;
  $vararg_ptr27 = ((($vararg_buffer24)) + 8|0);
  HEAPF64[$vararg_ptr27>>3] = $166;
  (_fprintf($162,59216,$vararg_buffer24)|0);
  $167 = $k;
  $168 = (($167) + 1)|0;
  $k = $168;
 }
 STACKTOP = sp;return;
}
function _new_capgain($list,$comment,$buy_amnt,$buy_date,$sell_amnt,$sell_date) {
 $list = $list|0;
 $comment = $comment|0;
 $buy_amnt = +$buy_amnt;
 $buy_date = $buy_date|0;
 $sell_amnt = +$sell_amnt;
 $sell_date = $sell_date|0;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0, $19 = 0, $2 = 0.0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0.0, $40 = 0, $41 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $new_item = 0, $prev = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $list;
 $1 = $comment;
 $2 = $buy_amnt;
 $3 = $buy_date;
 $4 = $sell_amnt;
 $5 = $sell_date;
 $6 = (_malloc(40)|0);
 $new_item = $6;
 $7 = $1;
 $8 = (___strdup($7)|0);
 $9 = $new_item;
 HEAP32[$9>>2] = $8;
 $10 = $2;
 $11 = $new_item;
 $12 = ((($11)) + 16|0);
 HEAPF64[$12>>3] = $10;
 $13 = $3;
 $14 = (___strdup($13)|0);
 $15 = $new_item;
 $16 = ((($15)) + 4|0);
 HEAP32[$16>>2] = $14;
 $17 = $4;
 $18 = $new_item;
 $19 = ((($18)) + 24|0);
 HEAPF64[$19>>3] = $17;
 $20 = $5;
 $21 = (___strdup($20)|0);
 $22 = $new_item;
 $23 = ((($22)) + 8|0);
 HEAP32[$23>>2] = $21;
 $24 = $new_item;
 $25 = ((($24)) + 32|0);
 HEAP32[$25>>2] = 0;
 $26 = $0;
 $27 = HEAP32[$26>>2]|0;
 $prev = $27;
 $28 = $prev;
 $29 = ($28|0)==(0|0);
 if ($29) {
  $30 = $new_item;
  $31 = $0;
  HEAP32[$31>>2] = $30;
  STACKTOP = sp;return;
 }
 while(1) {
  $32 = $prev;
  $33 = ((($32)) + 32|0);
  $34 = HEAP32[$33>>2]|0;
  $35 = ($34|0)!=(0|0);
  if (!($35)) {
   break;
  }
  $36 = $prev;
  $37 = ((($36)) + 32|0);
  $38 = HEAP32[$37>>2]|0;
  $prev = $38;
 }
 $39 = $new_item;
 $40 = $prev;
 $41 = ((($40)) + 32|0);
 HEAP32[$41>>2] = $39;
 STACKTOP = sp;return;
}
function _printf_capgain_list($list,$section,$message) {
 $list = $list|0;
 $section = $section|0;
 $message = $message|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0.0, $39 = 0, $4 = 0, $40 = 0, $41 = 0.0, $42 = 0.0, $43 = 0, $44 = 0;
 var $45 = 0.0, $46 = 0, $47 = 0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0, $52 = 0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0, $57 = 0, $58 = 0.0, $59 = 0.0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0.0, $68 = 0.0, $69 = 0.0, $7 = 0, $70 = 0.0, $71 = 0.0, $72 = 0.0, $8 = 0, $9 = 0, $item = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer14 = 0, $vararg_buffer16 = 0, $vararg_buffer4 = 0, $vararg_buffer6 = 0;
 var $vararg_ptr10 = 0, $vararg_ptr11 = 0, $vararg_ptr12 = 0, $vararg_ptr13 = 0, $vararg_ptr19 = 0, $vararg_ptr20 = 0, $vararg_ptr21 = 0, $vararg_ptr9 = 0, $word = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 4224|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer16 = sp + 72|0;
 $vararg_buffer14 = sp + 64|0;
 $vararg_buffer6 = sp + 24|0;
 $vararg_buffer4 = sp + 16|0;
 $vararg_buffer1 = sp + 8|0;
 $vararg_buffer = sp;
 $word = sp + 120|0;
 $0 = $list;
 $1 = $section;
 $2 = $message;
 HEAPF64[40648>>3] = 0.0;
 HEAPF64[40640>>3] = 0.0;
 $3 = HEAP32[56672>>2]|0;
 $4 = $2;
 HEAP32[$vararg_buffer>>2] = $4;
 (_fprintf($3,59305,$vararg_buffer)|0);
 $5 = HEAP32[56672>>2]|0;
 $6 = $1;
 HEAP32[$vararg_buffer1>>2] = $6;
 (_fprintf($5,59310,$vararg_buffer1)|0);
 $7 = HEAP32[56672>>2]|0;
 (_fprintf($7,59400,$vararg_buffer4)|0);
 $8 = $0;
 $item = $8;
 while(1) {
  $9 = $item;
  $10 = ($9|0)!=(0|0);
  if (!($10)) {
   break;
  }
  $11 = $item;
  $12 = HEAP32[$11>>2]|0;
  (_strcpy($word,$12)|0);
  $13 = (_strlen($word)|0);
  $14 = ($13>>>0)>(27);
  if ($14) {
   $15 = ((($word)) + 30|0);
   HEAP8[$15>>0] = 0;
  }
  $16 = (_strlen($word)|0);
  $17 = ($16>>>0)>(0);
  if ($17) {
   $18 = (_strlen($word)|0);
   $19 = (($18) - 1)|0;
   $20 = (($word) + ($19)|0);
   $21 = HEAP8[$20>>0]|0;
   $22 = $21 << 24 >> 24;
   $23 = ($22|0)==(125);
   if ($23) {
    $24 = (_strlen($word)|0);
    $25 = (($24) - 1)|0;
    $26 = (($word) + ($25)|0);
    HEAP8[$26>>0] = 0;
   }
  }
  while(1) {
   $27 = (_strlen($word)|0);
   $28 = ($27>>>0)<(27);
   if (!($28)) {
    break;
   }
   (_strcat($word,59490)|0);
  }
  $29 = HEAP32[56672>>2]|0;
  $30 = $item;
  $31 = ((($30)) + 4|0);
  $32 = HEAP32[$31>>2]|0;
  $33 = $item;
  $34 = ((($33)) + 8|0);
  $35 = HEAP32[$34>>2]|0;
  $36 = $item;
  $37 = ((($36)) + 24|0);
  $38 = +HEAPF64[$37>>3];
  $39 = $item;
  $40 = ((($39)) + 16|0);
  $41 = +HEAPF64[$40>>3];
  $42 = (+_absolutev($41));
  $43 = $item;
  $44 = ((($43)) + 24|0);
  $45 = +HEAPF64[$44>>3];
  $46 = $item;
  $47 = ((($46)) + 16|0);
  $48 = +HEAPF64[$47>>3];
  $49 = $45 + $48;
  HEAP32[$vararg_buffer6>>2] = $word;
  $vararg_ptr9 = ((($vararg_buffer6)) + 4|0);
  HEAP32[$vararg_ptr9>>2] = $32;
  $vararg_ptr10 = ((($vararg_buffer6)) + 8|0);
  HEAP32[$vararg_ptr10>>2] = $35;
  $vararg_ptr11 = ((($vararg_buffer6)) + 16|0);
  HEAPF64[$vararg_ptr11>>3] = $38;
  $vararg_ptr12 = ((($vararg_buffer6)) + 24|0);
  HEAPF64[$vararg_ptr12>>3] = $42;
  $vararg_ptr13 = ((($vararg_buffer6)) + 32|0);
  HEAPF64[$vararg_ptr13>>3] = $49;
  (_fprintf($29,59492,$vararg_buffer6)|0);
  $50 = +HEAPF64[40648>>3];
  $51 = $item;
  $52 = ((($51)) + 24|0);
  $53 = +HEAPF64[$52>>3];
  $54 = $50 + $53;
  HEAPF64[40648>>3] = $54;
  $55 = +HEAPF64[40640>>3];
  $56 = $item;
  $57 = ((($56)) + 16|0);
  $58 = +HEAPF64[$57>>3];
  $59 = $55 + $58;
  HEAPF64[40640>>3] = $59;
  $60 = $item;
  $61 = ((($60)) + 32|0);
  $62 = HEAP32[$61>>2]|0;
  $item = $62;
 }
 $63 = HEAP32[56672>>2]|0;
 (_fprintf($63,59400,$vararg_buffer14)|0);
 $64 = HEAP32[56672>>2]|0;
 $65 = $1;
 $66 = (($65) + 1)|0;
 $67 = +HEAPF64[40648>>3];
 $68 = +HEAPF64[40640>>3];
 $69 = (+_absolutev($68));
 $70 = +HEAPF64[40648>>3];
 $71 = +HEAPF64[40640>>3];
 $72 = $70 + $71;
 HEAP32[$vararg_buffer16>>2] = $66;
 $vararg_ptr19 = ((($vararg_buffer16)) + 8|0);
 HEAPF64[$vararg_ptr19>>3] = $67;
 $vararg_ptr20 = ((($vararg_buffer16)) + 16|0);
 HEAPF64[$vararg_ptr20>>3] = $69;
 $vararg_ptr21 = ((($vararg_buffer16)) + 24|0);
 HEAPF64[$vararg_ptr21>>3] = $72;
 (_fprintf($64,59528,$vararg_buffer16)|0);
 STACKTOP = sp;return;
}
function _free_capgain_list($list) {
 $list = $list|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $olditem = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $list;
 while(1) {
  $1 = $0;
  $2 = HEAP32[$1>>2]|0;
  $3 = ($2|0)!=(0|0);
  if (!($3)) {
   break;
  }
  $4 = $0;
  $5 = HEAP32[$4>>2]|0;
  $olditem = $5;
  $6 = $0;
  $7 = HEAP32[$6>>2]|0;
  $8 = ((($7)) + 32|0);
  $9 = HEAP32[$8>>2]|0;
  $10 = $0;
  HEAP32[$10>>2] = $9;
  $11 = $olditem;
  $12 = HEAP32[$11>>2]|0;
  _free($12);
  $13 = $olditem;
  _free($13);
 }
 STACKTOP = sp;return;
}
function _get_gain_and_losses($label) {
 $label = $label|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0.0;
 var $27 = 0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0.0, $67 = 0.0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $8 = 0, $9 = 0, $amnt1 = 0, $amnt2 = 0, $comment = 0, $comment2 = 0;
 var $date1 = 0, $date2 = 0, $date_str1 = 0, $date_str2 = 0, $toggle = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer13 = 0, $vararg_buffer17 = 0, $vararg_buffer20 = 0, $vararg_buffer24 = 0, $vararg_buffer28 = 0, $vararg_buffer30 = 0, $vararg_buffer32 = 0, $vararg_buffer35 = 0, $vararg_buffer4 = 0, $vararg_buffer6 = 0, $vararg_buffer9 = 0, $vararg_ptr12 = 0, $vararg_ptr16 = 0;
 var $vararg_ptr23 = 0, $vararg_ptr27 = 0, $variousdates = 0, $word = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 11408|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer35 = sp + 112|0;
 $vararg_buffer32 = sp + 104|0;
 $vararg_buffer30 = sp + 96|0;
 $vararg_buffer28 = sp + 88|0;
 $vararg_buffer24 = sp + 80|0;
 $vararg_buffer20 = sp + 72|0;
 $vararg_buffer17 = sp + 64|0;
 $vararg_buffer13 = sp + 56|0;
 $vararg_buffer9 = sp + 48|0;
 $vararg_buffer6 = sp + 40|0;
 $vararg_buffer4 = sp + 32|0;
 $vararg_buffer1 = sp + 24|0;
 $vararg_buffer = sp + 16|0;
 $comment = sp + 7304|0;
 $comment2 = sp + 5256|0;
 $date_str1 = sp + 4744|0;
 $date_str2 = sp + 4232|0;
 $word = sp + 136|0;
 $amnt1 = sp + 8|0;
 $amnt2 = sp;
 $0 = $label;
 $1 = $0;
 $2 = _emscripten_asm_const_1(9, ($1|0))|0;
 $toggle = 0;
 $date1 = 0;
 $variousdates = 0;
 $3 = HEAP32[56668>>2]|0;
 $4 = $0;
 _get_parameter($3,115,$word,$4);
 $5 = HEAP32[56668>>2]|0;
 _get_word($5,$word);
 L1: while(1) {
  $6 = HEAP8[$word>>0]|0;
  $7 = $6 << 24 >> 24;
  $8 = ($7|0)!=(59);
  if (!($8)) {
   label = 31;
   break;
  }
  $9 = HEAP32[56668>>2]|0;
  $10 = (_feof($9)|0);
  $11 = ($10|0)!=(0);
  if ($11) {
   label = 4;
   break;
  }
  $15 = HEAP32[56688>>2]|0;
  $16 = ($15|0)!=(0);
  if (!($16)) {
   $17 = HEAP32[56672>>2]|0;
   (_fprintf($17,59672,$vararg_buffer4)|0);
   HEAP32[56688>>2] = 1;
  }
  $18 = $toggle;
  L8: do {
   switch ($18|0) {
   case 0:  {
    $19 = $toggle;
    $20 = (($19) + 1)|0;
    $toggle = $20;
    HEAP32[$vararg_buffer6>>2] = $amnt1;
    $21 = (_sscanf($word,59089,$vararg_buffer6)|0);
    $22 = ($21|0)!=(1);
    if ($22) {
     label = 9;
     break L1;
    }
    $26 = +HEAPF64[$amnt1>>3];
    $27 = $26 > 0.0;
    if ($27) {
     $28 = +HEAPF64[$amnt1>>3];
     $29 = -$28;
     HEAPF64[$amnt1>>3] = $29;
    }
    break;
   }
   case 1:  {
    $30 = $toggle;
    $31 = (($30) + 1)|0;
    $toggle = $31;
    (_strcpy($date_str1,$word)|0);
    $32 = (_mystrcasestr($date_str1,59724)|0);
    $33 = ($32|0)!=(0|0);
    do {
     if ($33) {
      $variousdates = 1;
     } else {
      $34 = (_mystrcasestr($date_str1,59738)|0);
      $35 = ($34|0)!=(0|0);
      if ($35) {
       $variousdates = 2;
       break;
      } else {
       $36 = $0;
       $37 = (_get_date($word,$36)|0);
       $date1 = $37;
       break;
      }
     }
    } while(0);
    $38 = HEAP32[56668>>2]|0;
    _get_comment($38,$comment);
    break;
   }
   case 2:  {
    $39 = $toggle;
    $40 = (($39) + 1)|0;
    $toggle = $40;
    HEAP32[$vararg_buffer17>>2] = $amnt2;
    $41 = (_sscanf($word,59089,$vararg_buffer17)|0);
    $42 = ($41|0)!=(1);
    if ($42) {
     label = 19;
     break L1;
    }
    break;
   }
   case 3:  {
    $toggle = 0;
    (_strcpy($date_str2,$word)|0);
    $46 = $variousdates;
    $47 = ($46|0)==(1);
    do {
     if ($47) {
      $48 = $date1;
      $49 = (($48) + 2)|0;
      $date2 = $49;
     } else {
      $50 = $variousdates;
      $51 = ($50|0)==(1);
      if ($51) {
       $52 = $date1;
       $53 = (($52) + 730)|0;
       $date2 = $53;
       break;
      } else {
       $54 = $0;
       $55 = (_get_date($word,$54)|0);
       $date2 = $55;
       break;
      }
     }
    } while(0);
    $56 = HEAP32[56668>>2]|0;
    _get_comment($56,$comment2);
    (_strcat($comment,$comment2)|0);
    $57 = $date2;
    $58 = $date1;
    $59 = (($57) - ($58))|0;
    $60 = ($59|0)<(0);
    if ($60) {
     label = 26;
     break L1;
    }
    $62 = $date2;
    $63 = $date1;
    $64 = (($62) - ($63))|0;
    $65 = ($64|0)>(365);
    $66 = +HEAPF64[$amnt1>>3];
    $67 = +HEAPF64[$amnt2>>3];
    if ($65) {
     _new_capgain(56716,$comment,$66,$date_str1,$67,$date_str2);
     break L8;
    } else {
     _new_capgain(56712,$comment,$66,$date_str1,$67,$date_str2);
     break L8;
    }
    break;
   }
   default: {
   }
   }
  } while(0);
  $68 = HEAP32[56668>>2]|0;
  _get_word($68,$word);
 }
 if ((label|0) == 4) {
  $12 = $0;
  HEAP32[$vararg_buffer>>2] = $12;
  (_printf(59641,$vararg_buffer)|0);
  $13 = HEAP32[56672>>2]|0;
  $14 = $0;
  HEAP32[$vararg_buffer1>>2] = $14;
  (_fprintf($13,59641,$vararg_buffer1)|0);
  _exit(1);
  // unreachable;
 }
 else if ((label|0) == 9) {
  $23 = $0;
  HEAP32[$vararg_buffer9>>2] = $word;
  $vararg_ptr12 = ((($vararg_buffer9)) + 4|0);
  HEAP32[$vararg_ptr12>>2] = $23;
  (_printf(59688,$vararg_buffer9)|0);
  $24 = HEAP32[56672>>2]|0;
  $25 = $0;
  HEAP32[$vararg_buffer13>>2] = $word;
  $vararg_ptr16 = ((($vararg_buffer13)) + 4|0);
  HEAP32[$vararg_ptr16>>2] = $25;
  (_fprintf($24,59688,$vararg_buffer13)|0);
  _exit(1);
  // unreachable;
 }
 else if ((label|0) == 19) {
  $43 = $0;
  HEAP32[$vararg_buffer20>>2] = $word;
  $vararg_ptr23 = ((($vararg_buffer20)) + 4|0);
  HEAP32[$vararg_ptr23>>2] = $43;
  (_printf(59688,$vararg_buffer20)|0);
  $44 = HEAP32[56672>>2]|0;
  $45 = $0;
  HEAP32[$vararg_buffer24>>2] = $word;
  $vararg_ptr27 = ((($vararg_buffer24)) + 4|0);
  HEAP32[$vararg_ptr27>>2] = $45;
  (_fprintf($44,59688,$vararg_buffer24)|0);
  _exit(1);
  // unreachable;
 }
 else if ((label|0) == 26) {
  (_printf(59751,$vararg_buffer28)|0);
  $61 = HEAP32[56672>>2]|0;
  (_fprintf($61,59751,$vararg_buffer30)|0);
  _exit(1);
  // unreachable;
 }
 else if ((label|0) == 31) {
  $69 = $toggle;
  $70 = ($69|0)!=(0);
  if ($70) {
   $71 = $toggle;
   HEAP32[$vararg_buffer32>>2] = $71;
   (_printf(59785,$vararg_buffer32)|0);
   $72 = HEAP32[56672>>2]|0;
   $73 = $toggle;
   HEAP32[$vararg_buffer35>>2] = $73;
   (_fprintf($72,59785,$vararg_buffer35)|0);
   _exit(1);
   // unreachable;
  } else {
   $74 = $0;
   $75 = _emscripten_asm_const_1(10, ($74|0))|0;
   STACKTOP = sp;return;
  }
 }
}
function _get_cap_gains($emssg) {
 $emssg = $emssg|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0.0, $11 = 0, $110 = 0, $111 = 0.0, $112 = 0.0, $113 = 0.0, $114 = 0, $115 = 0.0;
 var $116 = 0.0, $117 = 0.0, $118 = 0, $119 = 0.0, $12 = 0.0, $120 = 0, $121 = 0.0, $122 = 0, $123 = 0.0, $124 = 0, $125 = 0.0, $126 = 0, $127 = 0.0, $128 = 0, $129 = 0.0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0.0, $136 = 0, $137 = 0.0, $138 = 0, $139 = 0, $14 = 0.0, $140 = 0.0, $141 = 0, $142 = 0.0, $143 = 0.0, $144 = 0.0, $145 = 0, $146 = 0, $147 = 0.0, $148 = 0, $149 = 0.0, $15 = 0, $150 = 0.0, $151 = 0.0;
 var $152 = 0, $153 = 0, $154 = 0.0, $155 = 0, $156 = 0.0, $157 = 0.0, $158 = 0.0, $159 = 0, $16 = 0, $160 = 0.0, $161 = 0, $162 = 0.0, $163 = 0, $164 = 0.0, $165 = 0.0, $166 = 0.0, $167 = 0.0, $168 = 0.0, $169 = 0.0, $17 = 0.0;
 var $170 = 0.0, $171 = 0.0, $172 = 0.0, $173 = 0.0, $174 = 0.0, $175 = 0.0, $176 = 0, $177 = 0.0, $178 = 0, $179 = 0, $18 = 0, $180 = 0.0, $181 = 0, $182 = 0.0, $183 = 0.0, $184 = 0.0, $185 = 0, $186 = 0, $187 = 0.0, $188 = 0;
 var $189 = 0.0, $19 = 0.0, $190 = 0.0, $191 = 0.0, $192 = 0, $193 = 0, $194 = 0.0, $195 = 0, $196 = 0.0, $197 = 0.0, $198 = 0.0, $199 = 0, $2 = 0, $20 = 0.0, $200 = 0.0, $201 = 0, $202 = 0.0, $203 = 0, $204 = 0.0, $205 = 0;
 var $206 = 0.0, $207 = 0.0, $208 = 0.0, $209 = 0.0, $21 = 0, $210 = 0.0, $211 = 0.0, $212 = 0.0, $213 = 0.0, $214 = 0.0, $215 = 0.0, $216 = 0.0, $217 = 0.0, $218 = 0.0, $219 = 0.0, $22 = 0, $220 = 0, $221 = 0.0, $222 = 0.0, $223 = 0.0;
 var $224 = 0.0, $225 = 0, $226 = 0.0, $227 = 0.0, $228 = 0, $229 = 0.0, $23 = 0, $230 = 0.0, $231 = 0, $232 = 0.0, $233 = 0, $234 = 0, $235 = 0.0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0.0, $240 = 0.0, $241 = 0;
 var $242 = 0.0, $243 = 0, $244 = 0.0, $245 = 0, $246 = 0, $247 = 0, $248 = 0.0, $249 = 0, $25 = 0, $250 = 0.0, $251 = 0.0, $252 = 0, $253 = 0.0, $254 = 0.0, $255 = 0, $256 = 0.0, $257 = 0.0, $258 = 0, $259 = 0.0, $26 = 0.0;
 var $260 = 0.0, $261 = 0, $262 = 0.0, $263 = 0.0, $264 = 0.0, $265 = 0, $266 = 0, $267 = 0.0, $268 = 0, $269 = 0.0, $27 = 0, $270 = 0, $271 = 0.0, $272 = 0.0, $273 = 0, $274 = 0.0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0.0, $281 = 0.0, $282 = 0, $283 = 0.0, $284 = 0.0, $285 = 0, $286 = 0.0, $287 = 0.0, $288 = 0, $289 = 0, $29 = 0.0, $290 = 0.0, $291 = 0, $292 = 0, $3 = 0, $30 = 0, $31 = 0.0, $32 = 0.0;
 var $33 = 0, $34 = 0, $35 = 0, $36 = 0.0, $37 = 0, $38 = 0.0, $39 = 0, $4 = 0, $40 = 0, $41 = 0.0, $42 = 0, $43 = 0.0, $44 = 0.0, $45 = 0, $46 = 0, $47 = 0, $48 = 0.0, $49 = 0, $5 = 0, $50 = 0.0;
 var $51 = 0, $52 = 0, $53 = 0.0, $54 = 0, $55 = 0.0, $56 = 0.0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0.0, $61 = 0, $62 = 0.0, $63 = 0, $64 = 0, $65 = 0.0, $66 = 0, $67 = 0.0, $68 = 0.0, $69 = 0;
 var $7 = 0, $70 = 0, $71 = 0, $72 = 0.0, $73 = 0, $74 = 0.0, $75 = 0, $76 = 0, $77 = 0.0, $78 = 0, $79 = 0.0, $8 = 0, $80 = 0.0, $81 = 0.0, $82 = 0.0, $83 = 0.0, $84 = 0.0, $85 = 0.0, $86 = 0.0, $87 = 0.0;
 var $88 = 0.0, $89 = 0.0, $9 = 0, $90 = 0.0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $LastYearsOutFile = 0, $SchedDd = 0, $SchedDe = 0, $doline22 = 0, $j = 0, $ltcg = 0.0, $maxloss = 0.0;
 var $or$cond = 0, $or$cond11 = 0, $or$cond13 = 0, $or$cond15 = 0, $or$cond3 = 0, $or$cond5 = 0, $or$cond7 = 0, $or$cond9 = 0, $stcg = 0.0, $vararg_buffer = 0, $vararg_buffer101 = 0, $vararg_buffer104 = 0, $vararg_buffer106 = 0, $vararg_buffer16 = 0, $vararg_buffer19 = 0, $vararg_buffer21 = 0, $vararg_buffer24 = 0, $vararg_buffer27 = 0, $vararg_buffer32 = 0, $vararg_buffer37 = 0;
 var $vararg_buffer42 = 0, $vararg_buffer45 = 0, $vararg_buffer48 = 0, $vararg_buffer51 = 0, $vararg_buffer54 = 0, $vararg_buffer59 = 0, $vararg_buffer64 = 0, $vararg_buffer69 = 0, $vararg_buffer72 = 0, $vararg_buffer75 = 0, $vararg_buffer78 = 0, $vararg_buffer81 = 0, $vararg_buffer84 = 0, $vararg_buffer87 = 0, $vararg_buffer89 = 0, $vararg_buffer92 = 0, $vararg_buffer95 = 0, $vararg_buffer97 = 0, $vararg_buffer99 = 0, $vararg_ptr30 = 0;
 var $vararg_ptr31 = 0, $vararg_ptr35 = 0, $vararg_ptr36 = 0, $vararg_ptr40 = 0, $vararg_ptr41 = 0, $vararg_ptr57 = 0, $vararg_ptr58 = 0, $vararg_ptr62 = 0, $vararg_ptr63 = 0, $vararg_ptr67 = 0, $vararg_ptr68 = 0, $word = 0, $wsd = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 5184|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer106 = sp + 1072|0;
 $vararg_buffer104 = sp + 1064|0;
 $vararg_buffer101 = sp + 1056|0;
 $vararg_buffer99 = sp + 1048|0;
 $vararg_buffer97 = sp + 1040|0;
 $vararg_buffer95 = sp + 1032|0;
 $vararg_buffer92 = sp + 1024|0;
 $vararg_buffer89 = sp + 1016|0;
 $vararg_buffer87 = sp + 1008|0;
 $vararg_buffer84 = sp + 1000|0;
 $vararg_buffer81 = sp + 992|0;
 $vararg_buffer78 = sp + 984|0;
 $vararg_buffer75 = sp + 976|0;
 $vararg_buffer72 = sp + 968|0;
 $vararg_buffer69 = sp + 960|0;
 $vararg_buffer64 = sp + 936|0;
 $vararg_buffer59 = sp + 912|0;
 $vararg_buffer54 = sp + 888|0;
 $vararg_buffer51 = sp + 880|0;
 $vararg_buffer48 = sp + 872|0;
 $vararg_buffer45 = sp + 864|0;
 $vararg_buffer42 = sp + 856|0;
 $vararg_buffer37 = sp + 832|0;
 $vararg_buffer32 = sp + 808|0;
 $vararg_buffer27 = sp + 784|0;
 $vararg_buffer24 = sp + 776|0;
 $vararg_buffer21 = sp + 768|0;
 $vararg_buffer19 = sp + 760|0;
 $vararg_buffer16 = sp + 752|0;
 $vararg_buffer = sp + 744|0;
 $word = sp + 1092|0;
 $SchedDd = sp + 568|0;
 $SchedDe = sp + 408|0;
 $wsd = sp + 8|0;
 $0 = $emssg;
 $LastYearsOutFile = 0;
 $doline22 = 0;
 $stcg = 0.0;
 $ltcg = 0.0;
 $j = 0;
 while(1) {
  $1 = $j;
  $2 = ($1|0)<(20);
  if (!($2)) {
   break;
  }
  $3 = $j;
  $4 = (($SchedDd) + ($3<<3)|0);
  HEAPF64[$4>>3] = 0.0;
  $5 = $j;
  $6 = (($SchedDe) + ($5<<3)|0);
  HEAPF64[$6>>3] = 0.0;
  $7 = $j;
  $8 = (($7) + 1)|0;
  $j = $8;
 }
 _get_gain_and_losses(59869);
 $9 = HEAP32[56712>>2]|0;
 $10 = ($9|0)!=(0|0);
 if ($10) {
  $11 = HEAP32[56712>>2]|0;
  _printf_capgain_list($11,1,59882);
  $12 = +HEAPF64[40648>>3];
  $13 = ((($SchedDd)) + 8|0);
  HEAPF64[$13>>3] = $12;
  $14 = +HEAPF64[40640>>3];
  $15 = ((($SchedDe)) + 8|0);
  HEAPF64[$15>>3] = $14;
  $16 = ((($SchedDd)) + 8|0);
  $17 = +HEAPF64[$16>>3];
  $18 = ((($SchedDe)) + 8|0);
  $19 = +HEAPF64[$18>>3];
  $20 = $17 + $19;
  HEAPF64[(16648)>>3] = $20;
  _free_capgain_list(56712);
 }
 $21 = HEAP32[56716>>2]|0;
 $22 = ($21|0)!=(0|0);
 if ($22) {
  $23 = HEAP32[56716>>2]|0;
  _printf_capgain_list($23,3,59962);
  $24 = +HEAPF64[40648>>3];
  $25 = ((($SchedDd)) + 64|0);
  HEAPF64[$25>>3] = $24;
  $26 = +HEAPF64[40640>>3];
  $27 = ((($SchedDe)) + 64|0);
  HEAPF64[$27>>3] = $26;
  $28 = ((($SchedDd)) + 64|0);
  $29 = +HEAPF64[$28>>3];
  $30 = ((($SchedDe)) + 64|0);
  $31 = +HEAPF64[$30>>3];
  $32 = $29 + $31;
  HEAPF64[(16704)>>3] = $32;
  _free_capgain_list(56716);
 }
 _get_gain_and_losses(60042);
 $33 = HEAP32[56712>>2]|0;
 $34 = ($33|0)!=(0|0);
 if ($34) {
  $35 = HEAP32[56712>>2]|0;
  _printf_capgain_list($35,1,60055);
  $36 = +HEAPF64[40648>>3];
  $37 = ((($SchedDd)) + 16|0);
  HEAPF64[$37>>3] = $36;
  $38 = +HEAPF64[40640>>3];
  $39 = ((($SchedDe)) + 16|0);
  HEAPF64[$39>>3] = $38;
  $40 = ((($SchedDd)) + 16|0);
  $41 = +HEAPF64[$40>>3];
  $42 = ((($SchedDe)) + 16|0);
  $43 = +HEAPF64[$42>>3];
  $44 = $41 + $43;
  HEAPF64[(16656)>>3] = $44;
  _free_capgain_list(56712);
 }
 $45 = HEAP32[56716>>2]|0;
 $46 = ($45|0)!=(0|0);
 if ($46) {
  $47 = HEAP32[56716>>2]|0;
  _printf_capgain_list($47,3,60139);
  $48 = +HEAPF64[40648>>3];
  $49 = ((($SchedDd)) + 72|0);
  HEAPF64[$49>>3] = $48;
  $50 = +HEAPF64[40640>>3];
  $51 = ((($SchedDe)) + 72|0);
  HEAPF64[$51>>3] = $50;
  $52 = ((($SchedDd)) + 72|0);
  $53 = +HEAPF64[$52>>3];
  $54 = ((($SchedDe)) + 72|0);
  $55 = +HEAPF64[$54>>3];
  $56 = $53 + $55;
  HEAPF64[(16712)>>3] = $56;
  _free_capgain_list(56716);
 }
 _get_gain_and_losses(60223);
 $57 = HEAP32[56712>>2]|0;
 $58 = ($57|0)!=(0|0);
 if ($58) {
  $59 = HEAP32[56712>>2]|0;
  _printf_capgain_list($59,1,60236);
  $60 = +HEAPF64[40648>>3];
  $61 = ((($SchedDd)) + 24|0);
  HEAPF64[$61>>3] = $60;
  $62 = +HEAPF64[40640>>3];
  $63 = ((($SchedDe)) + 24|0);
  HEAPF64[$63>>3] = $62;
  $64 = ((($SchedDd)) + 24|0);
  $65 = +HEAPF64[$64>>3];
  $66 = ((($SchedDe)) + 24|0);
  $67 = +HEAPF64[$66>>3];
  $68 = $65 + $67;
  HEAPF64[(16664)>>3] = $68;
  _free_capgain_list(56712);
 }
 $69 = HEAP32[56716>>2]|0;
 $70 = ($69|0)!=(0|0);
 if ($70) {
  $71 = HEAP32[56716>>2]|0;
  _printf_capgain_list($71,3,60323);
  $72 = +HEAPF64[40648>>3];
  $73 = ((($SchedDd)) + 80|0);
  HEAPF64[$73>>3] = $72;
  $74 = +HEAPF64[40640>>3];
  $75 = ((($SchedDe)) + 80|0);
  HEAPF64[$75>>3] = $74;
  $76 = ((($SchedDd)) + 80|0);
  $77 = +HEAPF64[$76>>3];
  $78 = ((($SchedDe)) + 80|0);
  $79 = +HEAPF64[$78>>3];
  $80 = $77 + $79;
  HEAPF64[(16720)>>3] = $80;
  _free_capgain_list(56716);
 }
 $81 = +HEAPF64[(16648)>>3];
 $82 = +HEAPF64[(16656)>>3];
 $83 = $81 + $82;
 $84 = +HEAPF64[(16664)>>3];
 $85 = $83 + $84;
 $stcg = $85;
 $86 = +HEAPF64[(16704)>>3];
 $87 = +HEAPF64[(16712)>>3];
 $88 = $86 + $87;
 $89 = +HEAPF64[(16720)>>3];
 $90 = $88 + $89;
 $ltcg = $90;
 _GetLine(60410,(16672));
 _GetLine(60413,(16680));
 $91 = HEAP32[56668>>2]|0;
 _get_parameter($91,115,$word,60416);
 $92 = HEAP32[56668>>2]|0;
 _get_word($92,$word);
 $93 = (_strcmp($word,60419)|0);
 $94 = ($93|0)!=(0);
 if ($94) {
  HEAP32[$vararg_buffer>>2] = (16688);
  $95 = (_sscanf($word,59089,$vararg_buffer)|0);
  $96 = ($95|0)!=(1);
  if ($96) {
   $97 = (___strdup($word)|0);
   $LastYearsOutFile = $97;
  }
  while(1) {
   $98 = HEAP32[56668>>2]|0;
   _get_word($98,$word);
   $99 = (_strlen($word)|0);
   $100 = ($99>>>0)>(0);
   if ($100) {
    $101 = (_strcmp($word,60419)|0);
    $102 = ($101|0)!=(0);
    if ($102) {
     $103 = HEAP32[56672>>2]|0;
     HEAP32[$vararg_buffer16>>2] = $word;
     (_fprintf($103,60421,$vararg_buffer16)|0);
    }
   }
   $104 = (_strcmp($word,60419)|0);
   $105 = ($104|0)!=(0);
   if (!($105)) {
    break;
   }
  }
 }
 _GetLine(60541,(16728));
 _GetLine(60545,(16736));
 _GetLine(60549,(16744));
 _GetLine(60553,(16752));
 $106 = $LastYearsOutFile;
 $107 = ($106|0)!=(0|0);
 if ($107) {
  $108 = $LastYearsOutFile;
  _CapitalLossCarryOverWorksheet($108,40656);
 }
 $109 = +HEAPF64[(16688)>>3];
 $110 = $109 > 0.0;
 if ($110) {
  $111 = +HEAPF64[(16688)>>3];
  $112 = -$111;
  HEAPF64[(16688)>>3] = $112;
 }
 $113 = +HEAPF64[(16752)>>3];
 $114 = $113 > 0.0;
 if ($114) {
  $115 = +HEAPF64[(16752)>>3];
  $116 = -$115;
  HEAPF64[(16752)>>3] = $116;
 }
 $117 = +HEAPF64[(16672)>>3];
 $118 = $117 != 0.0;
 $119 = +HEAPF64[(16680)>>3];
 $120 = $119 != 0.0;
 $or$cond = $118 | $120;
 $121 = +HEAPF64[(16688)>>3];
 $122 = $121 != 0.0;
 $or$cond3 = $or$cond | $122;
 $123 = +HEAPF64[(16728)>>3];
 $124 = $123 != 0.0;
 $or$cond5 = $or$cond3 | $124;
 $125 = +HEAPF64[(16736)>>3];
 $126 = $125 != 0.0;
 $or$cond7 = $or$cond5 | $126;
 $127 = +HEAPF64[(16744)>>3];
 $128 = $127 != 0.0;
 $or$cond9 = $or$cond7 | $128;
 $129 = +HEAPF64[(16752)>>3];
 $130 = $129 != 0.0;
 $or$cond11 = $or$cond9 | $130;
 if ($or$cond11) {
  HEAP32[56688>>2] = 1;
 }
 $131 = HEAP32[56688>>2]|0;
 $132 = ($131|0)!=(0);
 if (!($132)) {
  STACKTOP = sp;return;
 }
 $133 = HEAP32[56672>>2]|0;
 (_fprintf($133,60557,$vararg_buffer19)|0);
 $134 = HEAP32[56672>>2]|0;
 $135 = $stcg;
 HEAPF64[$vararg_buffer21>>3] = $135;
 (_fprintf($134,60587,$vararg_buffer21)|0);
 $136 = HEAP32[56672>>2]|0;
 $137 = $ltcg;
 HEAPF64[$vararg_buffer24>>3] = $137;
 (_fprintf($136,60630,$vararg_buffer24)|0);
 $138 = HEAP32[56672>>2]|0;
 $139 = ((($SchedDd)) + 8|0);
 $140 = +HEAPF64[$139>>3];
 $141 = ((($SchedDe)) + 8|0);
 $142 = +HEAPF64[$141>>3];
 $143 = (+_absolutev($142));
 $144 = +HEAPF64[(16648)>>3];
 HEAPF64[$vararg_buffer27>>3] = $140;
 $vararg_ptr30 = ((($vararg_buffer27)) + 8|0);
 HEAPF64[$vararg_ptr30>>3] = $143;
 $vararg_ptr31 = ((($vararg_buffer27)) + 16|0);
 HEAPF64[$vararg_ptr31>>3] = $144;
 (_fprintf($138,60673,$vararg_buffer27)|0);
 $145 = HEAP32[56672>>2]|0;
 $146 = ((($SchedDd)) + 16|0);
 $147 = +HEAPF64[$146>>3];
 $148 = ((($SchedDe)) + 16|0);
 $149 = +HEAPF64[$148>>3];
 $150 = (+_absolutev($149));
 $151 = +HEAPF64[(16656)>>3];
 HEAPF64[$vararg_buffer32>>3] = $147;
 $vararg_ptr35 = ((($vararg_buffer32)) + 8|0);
 HEAPF64[$vararg_ptr35>>3] = $150;
 $vararg_ptr36 = ((($vararg_buffer32)) + 16|0);
 HEAPF64[$vararg_ptr36>>3] = $151;
 (_fprintf($145,60718,$vararg_buffer32)|0);
 $152 = HEAP32[56672>>2]|0;
 $153 = ((($SchedDd)) + 24|0);
 $154 = +HEAPF64[$153>>3];
 $155 = ((($SchedDe)) + 24|0);
 $156 = +HEAPF64[$155>>3];
 $157 = (+_absolutev($156));
 $158 = +HEAPF64[(16664)>>3];
 HEAPF64[$vararg_buffer37>>3] = $154;
 $vararg_ptr40 = ((($vararg_buffer37)) + 8|0);
 HEAPF64[$vararg_ptr40>>3] = $157;
 $vararg_ptr41 = ((($vararg_buffer37)) + 16|0);
 HEAPF64[$vararg_ptr41>>3] = $158;
 (_fprintf($152,60763,$vararg_buffer37)|0);
 $159 = HEAP32[56672>>2]|0;
 $160 = +HEAPF64[(16672)>>3];
 HEAPF64[$vararg_buffer42>>3] = $160;
 (_fprintf($159,60808,$vararg_buffer42)|0);
 $161 = HEAP32[56672>>2]|0;
 $162 = +HEAPF64[(16680)>>3];
 HEAPF64[$vararg_buffer45>>3] = $162;
 (_fprintf($161,60821,$vararg_buffer45)|0);
 $163 = HEAP32[56672>>2]|0;
 $164 = +HEAPF64[(16688)>>3];
 HEAPF64[$vararg_buffer48>>3] = $164;
 (_fprintf($163,60834,$vararg_buffer48)|0);
 $165 = +HEAPF64[(16648)>>3];
 $166 = +HEAPF64[(16656)>>3];
 $167 = $165 + $166;
 $168 = +HEAPF64[(16664)>>3];
 $169 = $167 + $168;
 $170 = +HEAPF64[(16672)>>3];
 $171 = $169 + $170;
 $172 = +HEAPF64[(16680)>>3];
 $173 = $171 + $172;
 $174 = +HEAPF64[(16688)>>3];
 $175 = $173 + $174;
 HEAPF64[(16696)>>3] = $175;
 $176 = HEAP32[56672>>2]|0;
 $177 = +HEAPF64[(16696)>>3];
 HEAPF64[$vararg_buffer51>>3] = $177;
 (_fprintf($176,60866,$vararg_buffer51)|0);
 $178 = HEAP32[56672>>2]|0;
 $179 = ((($SchedDd)) + 64|0);
 $180 = +HEAPF64[$179>>3];
 $181 = ((($SchedDe)) + 64|0);
 $182 = +HEAPF64[$181>>3];
 $183 = (+_absolutev($182));
 $184 = +HEAPF64[(16704)>>3];
 HEAPF64[$vararg_buffer54>>3] = $180;
 $vararg_ptr57 = ((($vararg_buffer54)) + 8|0);
 HEAPF64[$vararg_ptr57>>3] = $183;
 $vararg_ptr58 = ((($vararg_buffer54)) + 16|0);
 HEAPF64[$vararg_ptr58>>3] = $184;
 (_fprintf($178,60920,$vararg_buffer54)|0);
 $185 = HEAP32[56672>>2]|0;
 $186 = ((($SchedDd)) + 72|0);
 $187 = +HEAPF64[$186>>3];
 $188 = ((($SchedDe)) + 72|0);
 $189 = +HEAPF64[$188>>3];
 $190 = (+_absolutev($189));
 $191 = +HEAPF64[(16712)>>3];
 HEAPF64[$vararg_buffer59>>3] = $187;
 $vararg_ptr62 = ((($vararg_buffer59)) + 8|0);
 HEAPF64[$vararg_ptr62>>3] = $190;
 $vararg_ptr63 = ((($vararg_buffer59)) + 16|0);
 HEAPF64[$vararg_ptr63>>3] = $191;
 (_fprintf($185,60964,$vararg_buffer59)|0);
 $192 = HEAP32[56672>>2]|0;
 $193 = ((($SchedDd)) + 80|0);
 $194 = +HEAPF64[$193>>3];
 $195 = ((($SchedDe)) + 80|0);
 $196 = +HEAPF64[$195>>3];
 $197 = (+_absolutev($196));
 $198 = +HEAPF64[(16720)>>3];
 HEAPF64[$vararg_buffer64>>3] = $194;
 $vararg_ptr67 = ((($vararg_buffer64)) + 8|0);
 HEAPF64[$vararg_ptr67>>3] = $197;
 $vararg_ptr68 = ((($vararg_buffer64)) + 16|0);
 HEAPF64[$vararg_ptr68>>3] = $198;
 (_fprintf($192,61008,$vararg_buffer64)|0);
 $199 = HEAP32[56672>>2]|0;
 $200 = +HEAPF64[(16728)>>3];
 HEAPF64[$vararg_buffer69>>3] = $200;
 (_fprintf($199,61052,$vararg_buffer69)|0);
 $201 = HEAP32[56672>>2]|0;
 $202 = +HEAPF64[(16736)>>3];
 HEAPF64[$vararg_buffer72>>3] = $202;
 (_fprintf($201,61066,$vararg_buffer72)|0);
 $203 = HEAP32[56672>>2]|0;
 $204 = +HEAPF64[(16744)>>3];
 HEAPF64[$vararg_buffer75>>3] = $204;
 (_fprintf($203,61080,$vararg_buffer75)|0);
 $205 = HEAP32[56672>>2]|0;
 $206 = +HEAPF64[(16752)>>3];
 HEAPF64[$vararg_buffer78>>3] = $206;
 (_fprintf($205,61094,$vararg_buffer78)|0);
 $207 = +HEAPF64[(16704)>>3];
 $208 = +HEAPF64[(16712)>>3];
 $209 = $207 + $208;
 $210 = +HEAPF64[(16720)>>3];
 $211 = $209 + $210;
 $212 = +HEAPF64[(16728)>>3];
 $213 = $211 + $212;
 $214 = +HEAPF64[(16736)>>3];
 $215 = $213 + $214;
 $216 = +HEAPF64[(16744)>>3];
 $217 = $215 + $216;
 $218 = +HEAPF64[(16752)>>3];
 $219 = $217 + $218;
 HEAPF64[(16760)>>3] = $219;
 $220 = HEAP32[56672>>2]|0;
 $221 = +HEAPF64[(16760)>>3];
 HEAPF64[$vararg_buffer81>>3] = $221;
 (_fprintf($220,61126,$vararg_buffer81)|0);
 $222 = +HEAPF64[(16696)>>3];
 $223 = +HEAPF64[(16760)>>3];
 $224 = $222 + $223;
 HEAPF64[(16768)>>3] = $224;
 $225 = HEAP32[56672>>2]|0;
 $226 = +HEAPF64[(16768)>>3];
 HEAPF64[$vararg_buffer84>>3] = $226;
 (_fprintf($225,61180,$vararg_buffer84)|0);
 $227 = +HEAPF64[(16768)>>3];
 $228 = $227 > 0.0;
 $229 = +HEAPF64[(16768)>>3];
 do {
  if ($228) {
   HEAPF64[(112)>>3] = $229;
   $230 = +HEAPF64[(16760)>>3];
   $231 = $230 > 0.0;
   $232 = +HEAPF64[(16768)>>3];
   $233 = $232 > 0.0;
   $or$cond13 = $231 & $233;
   if (!($or$cond13)) {
    (_printf(61257,$vararg_buffer99)|0);
    $doline22 = 1;
    break;
   }
   $234 = HEAP32[56672>>2]|0;
   (_fprintf($234,61194,$vararg_buffer87)|0);
   $235 = +HEAPF64[8048>>3];
   $236 = ((($wsd)) + 8|0);
   HEAPF64[$236>>3] = $235;
   $237 = ((($wsd)) + 16|0);
   HEAPF64[$237>>3] = 0.0;
   $238 = ((($wsd)) + 24|0);
   HEAPF64[$238>>3] = 0.0;
   $239 = ((($wsd)) + 32|0);
   HEAPF64[$239>>3] = 0.0;
   $240 = +HEAPF64[(16752)>>3];
   $241 = ((($wsd)) + 40|0);
   HEAPF64[$241>>3] = $240;
   $242 = +HEAPF64[(16696)>>3];
   $243 = $242 < 0.0;
   if ($243) {
    $244 = +HEAPF64[(16696)>>3];
    $245 = ((($wsd)) + 48|0);
    HEAPF64[$245>>3] = $244;
   } else {
    $246 = ((($wsd)) + 48|0);
    HEAPF64[$246>>3] = 0.0;
   }
   $247 = ((($wsd)) + 8|0);
   $248 = +HEAPF64[$247>>3];
   $249 = ((($wsd)) + 16|0);
   $250 = +HEAPF64[$249>>3];
   $251 = $248 + $250;
   $252 = ((($wsd)) + 24|0);
   $253 = +HEAPF64[$252>>3];
   $254 = $251 + $253;
   $255 = ((($wsd)) + 32|0);
   $256 = +HEAPF64[$255>>3];
   $257 = $254 + $256;
   $258 = ((($wsd)) + 40|0);
   $259 = +HEAPF64[$258>>3];
   $260 = $257 + $259;
   $261 = ((($wsd)) + 48|0);
   $262 = +HEAPF64[$261>>3];
   $263 = $260 + $262;
   $264 = (+_NotLessThanZero($263));
   $265 = ((($wsd)) + 56|0);
   HEAPF64[$265>>3] = $264;
   $266 = ((($wsd)) + 56|0);
   $267 = +HEAPF64[$266>>3];
   HEAPF64[(16784)>>3] = $267;
   $268 = HEAP32[56672>>2]|0;
   $269 = +HEAPF64[(16784)>>3];
   HEAPF64[$vararg_buffer89>>3] = $269;
   (_fprintf($268,61206,$vararg_buffer89)|0);
   $270 = HEAP32[56672>>2]|0;
   $271 = +HEAPF64[(16792)>>3];
   HEAPF64[$vararg_buffer92>>3] = $271;
   (_fprintf($270,61220,$vararg_buffer92)|0);
   $272 = +HEAPF64[(16784)>>3];
   $273 = $272 == 0.0;
   $274 = +HEAPF64[(16792)>>3];
   $275 = $274 == 0.0;
   $or$cond15 = $273 & $275;
   $276 = HEAP32[56672>>2]|0;
   if ($or$cond15) {
    (_fprintf($276,61234,$vararg_buffer95)|0);
    HEAP32[56692>>2] = 1;
   } else {
    (_fprintf($276,61246,$vararg_buffer97)|0);
    HEAP32[56696>>2] = 1;
    HEAP32[56692>>2] = 0;
   }
   $doline22 = 0;
  } else {
   $277 = $229 < 0.0;
   if (!($277)) {
    HEAPF64[(112)>>3] = 0.0;
    $doline22 = 1;
    break;
   }
   $278 = HEAP32[56708>>2]|0;
   $279 = ($278|0)==(3);
   if ($279) {
    $maxloss = -1500.0;
   } else {
    $maxloss = -3000.0;
   }
   $280 = +HEAPF64[(16768)>>3];
   $281 = $maxloss;
   $282 = $280 < $281;
   if ($282) {
    $283 = $maxloss;
    HEAPF64[(16808)>>3] = $283;
   } else {
    $284 = +HEAPF64[(16768)>>3];
    HEAPF64[(16808)>>3] = $284;
   }
   $285 = HEAP32[56672>>2]|0;
   $286 = +HEAPF64[(16808)>>3];
   HEAPF64[$vararg_buffer101>>3] = $286;
   (_fprintf($285,61268,$vararg_buffer101)|0);
   $287 = +HEAPF64[(16808)>>3];
   HEAPF64[(112)>>3] = $287;
   $doline22 = 1;
  }
 } while(0);
 $288 = $doline22;
 $289 = ($288|0)!=(0);
 if (!($289)) {
  STACKTOP = sp;return;
 }
 $290 = +HEAPF64[8016>>3];
 $291 = $290 > 0.0;
 $292 = HEAP32[56672>>2]|0;
 if ($291) {
  (_fprintf($292,61282,$vararg_buffer104)|0);
  HEAP32[56692>>2] = 1;
  STACKTOP = sp;return;
 } else {
  (_fprintf($292,61294,$vararg_buffer106)|0);
  STACKTOP = sp;return;
 }
}
function _sched_D_tax_worksheet($status,$L9b) {
 $status = $status|0;
 $L9b = +$L9b;
 var $0 = 0, $1 = 0.0, $10 = 0.0, $100 = 0.0, $101 = 0, $102 = 0.0, $103 = 0.0, $104 = 0.0, $105 = 0, $106 = 0, $107 = 0.0, $108 = 0, $109 = 0.0, $11 = 0, $110 = 0.0, $111 = 0, $112 = 0, $113 = 0.0, $114 = 0, $115 = 0.0;
 var $116 = 0.0, $117 = 0, $118 = 0, $119 = 0.0, $12 = 0, $120 = 0, $121 = 0.0, $122 = 0, $123 = 0, $124 = 0.0, $125 = 0, $126 = 0.0, $127 = 0.0, $128 = 0, $129 = 0, $13 = 0, $130 = 0.0, $131 = 0, $132 = 0, $133 = 0.0;
 var $134 = 0, $135 = 0.0, $136 = 0.0, $137 = 0.0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0.0, $146 = 0, $147 = 0.0, $148 = 0.0, $149 = 0, $15 = 0.0, $150 = 0, $151 = 0.0;
 var $152 = 0, $153 = 0.0, $154 = 0.0, $155 = 0, $156 = 0, $157 = 0.0, $158 = 0, $159 = 0.0, $16 = 0, $160 = 0.0, $161 = 0.0, $162 = 0, $163 = 0, $164 = 0.0, $165 = 0, $166 = 0.0, $167 = 0.0, $168 = 0, $169 = 0, $17 = 0.0;
 var $170 = 0.0, $171 = 0.0, $172 = 0, $173 = 0, $174 = 0.0, $175 = 0, $176 = 0.0, $177 = 0.0, $178 = 0, $179 = 0, $18 = 0.0, $180 = 0.0, $181 = 0, $182 = 0.0, $183 = 0, $184 = 0, $185 = 0.0, $186 = 0, $187 = 0.0, $188 = 0.0;
 var $189 = 0, $19 = 0.0, $190 = 0, $191 = 0.0, $192 = 0.0, $193 = 0, $194 = 0.0, $195 = 0, $196 = 0, $197 = 0.0, $198 = 0.0, $199 = 0.0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0.0, $203 = 0, $204 = 0.0, $205 = 0.0;
 var $206 = 0, $207 = 0, $208 = 0.0, $209 = 0, $21 = 0, $210 = 0, $211 = 0.0, $212 = 0, $213 = 0.0, $214 = 0.0, $215 = 0.0, $216 = 0, $217 = 0, $218 = 0.0, $219 = 0, $22 = 0.0, $220 = 0.0, $221 = 0.0, $222 = 0.0, $223 = 0;
 var $224 = 0, $225 = 0.0, $226 = 0.0, $227 = 0, $228 = 0.0, $229 = 0, $23 = 0, $230 = 0, $231 = 0.0, $232 = 0, $233 = 0.0, $234 = 0.0, $235 = 0, $236 = 0.0, $237 = 0.0, $238 = 0, $239 = 0.0, $24 = 0.0, $240 = 0.0, $241 = 0;
 var $242 = 0.0, $243 = 0.0, $244 = 0, $245 = 0, $246 = 0.0, $247 = 0, $248 = 0.0, $249 = 0.0, $25 = 0.0, $250 = 0, $251 = 0, $252 = 0.0, $253 = 0.0, $254 = 0, $255 = 0, $256 = 0.0, $257 = 0, $258 = 0.0, $259 = 0, $26 = 0.0;
 var $260 = 0, $261 = 0.0, $262 = 0, $263 = 0.0, $264 = 0.0, $265 = 0, $266 = 0.0, $267 = 0.0, $268 = 0, $269 = 0.0, $27 = 0, $270 = 0.0, $271 = 0, $272 = 0.0, $273 = 0.0, $274 = 0, $275 = 0, $276 = 0.0, $277 = 0, $278 = 0.0;
 var $279 = 0, $28 = 0.0, $280 = 0, $281 = 0.0, $282 = 0, $283 = 0.0, $284 = 0.0, $285 = 0, $286 = 0, $287 = 0.0, $288 = 0, $289 = 0, $29 = 0.0, $290 = 0, $291 = 0, $292 = 0.0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $3 = 0, $30 = 0.0, $31 = 0, $32 = 0, $33 = 0.0, $34 = 0, $35 = 0.0, $36 = 0.0, $37 = 0, $38 = 0, $39 = 0.0, $4 = 0, $40 = 0, $41 = 0.0, $42 = 0.0, $43 = 0.0, $44 = 0, $45 = 0, $46 = 0.0, $47 = 0;
 var $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0, $58 = 0, $59 = 0.0, $6 = 0, $60 = 0, $61 = 0.0, $62 = 0.0, $63 = 0, $64 = 0, $65 = 0.0;
 var $66 = 0, $67 = 0.0, $68 = 0.0, $69 = 0, $7 = 0, $70 = 0, $71 = 0.0, $72 = 0, $73 = 0.0, $74 = 0.0, $75 = 0.0, $76 = 0, $77 = 0, $78 = 0, $79 = 0.0, $8 = 0.0, $80 = 0, $81 = 0, $82 = 0.0, $83 = 0;
 var $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0.0, $89 = 0, $9 = 0, $90 = 0.0, $91 = 0.0, $92 = 0, $93 = 0, $94 = 0.0, $95 = 0, $96 = 0.0, $97 = 0.0, $98 = 0, $99 = 0, $k = 0, $vararg_buffer = 0, $vararg_buffer1 = 0;
 var $vararg_buffer4 = 0, $ws = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 848|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer4 = sp + 824|0;
 $vararg_buffer1 = sp + 816|0;
 $vararg_buffer = sp + 808|0;
 $ws = sp;
 $0 = $status;
 $1 = $L9b;
 $k = 0;
 while(1) {
  $2 = $k;
  $3 = ($2|0)<(100);
  if (!($3)) {
   break;
  }
  $4 = $k;
  $5 = (($ws) + ($4<<3)|0);
  HEAPF64[$5>>3] = 0.0;
  $6 = $k;
  $7 = (($6) + 1)|0;
  $k = $7;
 }
 $8 = +HEAPF64[(352)>>3];
 $9 = ((($ws)) + 8|0);
 HEAPF64[$9>>3] = $8;
 $10 = $1;
 $11 = ((($ws)) + 16|0);
 HEAPF64[$11>>3] = $10;
 $12 = ((($ws)) + 24|0);
 HEAPF64[$12>>3] = 0.0;
 $13 = ((($ws)) + 32|0);
 HEAPF64[$13>>3] = 0.0;
 $14 = ((($ws)) + 24|0);
 $15 = +HEAPF64[$14>>3];
 $16 = ((($ws)) + 32|0);
 $17 = +HEAPF64[$16>>3];
 $18 = $15 - $17;
 $19 = (+_NotLessThanZero($18));
 $20 = ((($ws)) + 40|0);
 HEAPF64[$20>>3] = $19;
 $21 = ((($ws)) + 16|0);
 $22 = +HEAPF64[$21>>3];
 $23 = ((($ws)) + 40|0);
 $24 = +HEAPF64[$23>>3];
 $25 = $22 - $24;
 $26 = (+_NotLessThanZero($25));
 $27 = ((($ws)) + 48|0);
 HEAPF64[$27>>3] = $26;
 $28 = +HEAPF64[(16760)>>3];
 $29 = +HEAPF64[(16768)>>3];
 $30 = (+_smallerof($28,$29));
 $31 = ((($ws)) + 56|0);
 HEAPF64[$31>>3] = $30;
 $32 = ((($ws)) + 24|0);
 $33 = +HEAPF64[$32>>3];
 $34 = ((($ws)) + 32|0);
 $35 = +HEAPF64[$34>>3];
 $36 = (+_smallerof($33,$35));
 $37 = ((($ws)) + 64|0);
 HEAPF64[$37>>3] = $36;
 $38 = ((($ws)) + 56|0);
 $39 = +HEAPF64[$38>>3];
 $40 = ((($ws)) + 64|0);
 $41 = +HEAPF64[$40>>3];
 $42 = $39 - $41;
 $43 = (+_NotLessThanZero($42));
 $44 = ((($ws)) + 72|0);
 HEAPF64[$44>>3] = $43;
 $45 = ((($ws)) + 48|0);
 $46 = +HEAPF64[$45>>3];
 $47 = ((($ws)) + 72|0);
 $48 = +HEAPF64[$47>>3];
 $49 = $46 + $48;
 $50 = ((($ws)) + 80|0);
 HEAPF64[$50>>3] = $49;
 $51 = HEAP32[56672>>2]|0;
 $52 = ((($ws)) + 80|0);
 $53 = +HEAPF64[$52>>3];
 HEAPF64[$vararg_buffer>>3] = $53;
 (_fprintf($51,61305,$vararg_buffer)|0);
 $54 = +HEAPF64[(16784)>>3];
 $55 = +HEAPF64[(16792)>>3];
 $56 = $54 + $55;
 $57 = ((($ws)) + 88|0);
 HEAPF64[$57>>3] = $56;
 $58 = ((($ws)) + 72|0);
 $59 = +HEAPF64[$58>>3];
 $60 = ((($ws)) + 88|0);
 $61 = +HEAPF64[$60>>3];
 $62 = (+_smallerof($59,$61));
 $63 = ((($ws)) + 96|0);
 HEAPF64[$63>>3] = $62;
 $64 = ((($ws)) + 80|0);
 $65 = +HEAPF64[$64>>3];
 $66 = ((($ws)) + 96|0);
 $67 = +HEAPF64[$66>>3];
 $68 = $65 - $67;
 $69 = ((($ws)) + 104|0);
 HEAPF64[$69>>3] = $68;
 $70 = ((($ws)) + 8|0);
 $71 = +HEAPF64[$70>>3];
 $72 = ((($ws)) + 104|0);
 $73 = +HEAPF64[$72>>3];
 $74 = $71 - $73;
 $75 = (+_NotLessThanZero($74));
 $76 = ((($ws)) + 112|0);
 HEAPF64[$76>>3] = $75;
 $77 = HEAP32[56672>>2]|0;
 $78 = ((($ws)) + 104|0);
 $79 = +HEAPF64[$78>>3];
 HEAPF64[$vararg_buffer1>>3] = $79;
 (_fprintf($77,61346,$vararg_buffer1)|0);
 $80 = HEAP32[56672>>2]|0;
 $81 = ((($ws)) + 112|0);
 $82 = +HEAPF64[$81>>3];
 HEAPF64[$vararg_buffer4>>3] = $82;
 (_fprintf($80,61387,$vararg_buffer4)|0);
 $83 = $0;
 switch ($83|0) {
 case 3: case 1:  {
  $84 = ((($ws)) + 120|0);
  HEAPF64[$84>>3] = 37650.0;
  break;
 }
 case 5: case 2:  {
  $85 = ((($ws)) + 120|0);
  HEAPF64[$85>>3] = 75300.0;
  break;
 }
 case 4:  {
  $86 = ((($ws)) + 120|0);
  HEAPF64[$86>>3] = 50400.0;
  break;
 }
 default: {
 }
 }
 $87 = ((($ws)) + 8|0);
 $88 = +HEAPF64[$87>>3];
 $89 = ((($ws)) + 120|0);
 $90 = +HEAPF64[$89>>3];
 $91 = (+_smallerof($88,$90));
 $92 = ((($ws)) + 128|0);
 HEAPF64[$92>>3] = $91;
 $93 = ((($ws)) + 112|0);
 $94 = +HEAPF64[$93>>3];
 $95 = ((($ws)) + 128|0);
 $96 = +HEAPF64[$95>>3];
 $97 = (+_smallerof($94,$96));
 $98 = ((($ws)) + 136|0);
 HEAPF64[$98>>3] = $97;
 $99 = ((($ws)) + 8|0);
 $100 = +HEAPF64[$99>>3];
 $101 = ((($ws)) + 80|0);
 $102 = +HEAPF64[$101>>3];
 $103 = $100 - $102;
 $104 = (+_NotLessThanZero($103));
 $105 = ((($ws)) + 144|0);
 HEAPF64[$105>>3] = $104;
 $106 = ((($ws)) + 136|0);
 $107 = +HEAPF64[$106>>3];
 $108 = ((($ws)) + 144|0);
 $109 = +HEAPF64[$108>>3];
 $110 = (+_largerof($107,$109));
 $111 = ((($ws)) + 152|0);
 HEAPF64[$111>>3] = $110;
 $112 = ((($ws)) + 128|0);
 $113 = +HEAPF64[$112>>3];
 $114 = ((($ws)) + 136|0);
 $115 = +HEAPF64[$114>>3];
 $116 = $113 - $115;
 $117 = ((($ws)) + 160|0);
 HEAPF64[$117>>3] = $116;
 $118 = ((($ws)) + 8|0);
 $119 = +HEAPF64[$118>>3];
 $120 = ((($ws)) + 128|0);
 $121 = +HEAPF64[$120>>3];
 $122 = $119 != $121;
 if ($122) {
  $123 = ((($ws)) + 8|0);
  $124 = +HEAPF64[$123>>3];
  $125 = ((($ws)) + 104|0);
  $126 = +HEAPF64[$125>>3];
  $127 = (+_smallerof($124,$126));
  $128 = ((($ws)) + 168|0);
  HEAPF64[$128>>3] = $127;
  $129 = ((($ws)) + 160|0);
  $130 = +HEAPF64[$129>>3];
  $131 = ((($ws)) + 176|0);
  HEAPF64[$131>>3] = $130;
  $132 = ((($ws)) + 168|0);
  $133 = +HEAPF64[$132>>3];
  $134 = ((($ws)) + 176|0);
  $135 = +HEAPF64[$134>>3];
  $136 = $133 - $135;
  $137 = (+_NotLessThanZero($136));
  $138 = ((($ws)) + 184|0);
  HEAPF64[$138>>3] = $137;
  $139 = $0;
  switch ($139|0) {
  case 1:  {
   $140 = ((($ws)) + 192|0);
   HEAPF64[$140>>3] = 415050.0;
   break;
  }
  case 3:  {
   $141 = ((($ws)) + 192|0);
   HEAPF64[$141>>3] = 233475.0;
   break;
  }
  case 5: case 2:  {
   $142 = ((($ws)) + 192|0);
   HEAPF64[$142>>3] = 466950.0;
   break;
  }
  case 4:  {
   $143 = ((($ws)) + 192|0);
   HEAPF64[$143>>3] = 441000.0;
   break;
  }
  default: {
  }
  }
  $144 = ((($ws)) + 8|0);
  $145 = +HEAPF64[$144>>3];
  $146 = ((($ws)) + 192|0);
  $147 = +HEAPF64[$146>>3];
  $148 = (+_smallerof($145,$147));
  $149 = ((($ws)) + 200|0);
  HEAPF64[$149>>3] = $148;
  $150 = ((($ws)) + 152|0);
  $151 = +HEAPF64[$150>>3];
  $152 = ((($ws)) + 160|0);
  $153 = +HEAPF64[$152>>3];
  $154 = $151 + $153;
  $155 = ((($ws)) + 208|0);
  HEAPF64[$155>>3] = $154;
  $156 = ((($ws)) + 200|0);
  $157 = +HEAPF64[$156>>3];
  $158 = ((($ws)) + 208|0);
  $159 = +HEAPF64[$158>>3];
  $160 = $157 - $159;
  $161 = (+_NotLessThanZero($160));
  $162 = ((($ws)) + 216|0);
  HEAPF64[$162>>3] = $161;
  $163 = ((($ws)) + 184|0);
  $164 = +HEAPF64[$163>>3];
  $165 = ((($ws)) + 216|0);
  $166 = +HEAPF64[$165>>3];
  $167 = (+_smallerof($164,$166));
  $168 = ((($ws)) + 224|0);
  HEAPF64[$168>>3] = $167;
  $169 = ((($ws)) + 224|0);
  $170 = +HEAPF64[$169>>3];
  $171 = 0.14999999999999999 * $170;
  $172 = ((($ws)) + 232|0);
  HEAPF64[$172>>3] = $171;
  $173 = ((($ws)) + 176|0);
  $174 = +HEAPF64[$173>>3];
  $175 = ((($ws)) + 224|0);
  $176 = +HEAPF64[$175>>3];
  $177 = $174 + $176;
  $178 = ((($ws)) + 240|0);
  HEAPF64[$178>>3] = $177;
  $179 = ((($ws)) + 8|0);
  $180 = +HEAPF64[$179>>3];
  $181 = ((($ws)) + 240|0);
  $182 = +HEAPF64[$181>>3];
  $183 = $180 != $182;
  if ($183) {
   $184 = ((($ws)) + 168|0);
   $185 = +HEAPF64[$184>>3];
   $186 = ((($ws)) + 240|0);
   $187 = +HEAPF64[$186>>3];
   $188 = $185 - $187;
   $189 = ((($ws)) + 248|0);
   HEAPF64[$189>>3] = $188;
   $190 = ((($ws)) + 248|0);
   $191 = +HEAPF64[$190>>3];
   $192 = 0.20000000000000001 * $191;
   $193 = ((($ws)) + 256|0);
   HEAPF64[$193>>3] = $192;
   $194 = +HEAPF64[(16792)>>3];
   $195 = $194 != 0.0;
   if ($195) {
    $196 = ((($ws)) + 72|0);
    $197 = +HEAPF64[$196>>3];
    $198 = +HEAPF64[(16792)>>3];
    $199 = (+_smallerof($197,$198));
    $200 = ((($ws)) + 264|0);
    HEAPF64[$200>>3] = $199;
    $201 = ((($ws)) + 80|0);
    $202 = +HEAPF64[$201>>3];
    $203 = ((($ws)) + 152|0);
    $204 = +HEAPF64[$203>>3];
    $205 = $202 + $204;
    $206 = ((($ws)) + 272|0);
    HEAPF64[$206>>3] = $205;
    $207 = ((($ws)) + 8|0);
    $208 = +HEAPF64[$207>>3];
    $209 = ((($ws)) + 280|0);
    HEAPF64[$209>>3] = $208;
    $210 = ((($ws)) + 272|0);
    $211 = +HEAPF64[$210>>3];
    $212 = ((($ws)) + 280|0);
    $213 = +HEAPF64[$212>>3];
    $214 = $211 - $213;
    $215 = (+_NotLessThanZero($214));
    $216 = ((($ws)) + 288|0);
    HEAPF64[$216>>3] = $215;
    $217 = ((($ws)) + 264|0);
    $218 = +HEAPF64[$217>>3];
    $219 = ((($ws)) + 288|0);
    $220 = +HEAPF64[$219>>3];
    $221 = $218 - $220;
    $222 = (+_NotLessThanZero($221));
    $223 = ((($ws)) + 296|0);
    HEAPF64[$223>>3] = $222;
    $224 = ((($ws)) + 296|0);
    $225 = +HEAPF64[$224>>3];
    $226 = 0.25 * $225;
    $227 = ((($ws)) + 304|0);
    HEAPF64[$227>>3] = $226;
   }
   $228 = +HEAPF64[(16784)>>3];
   $229 = $228 != 0.0;
   if ($229) {
    $230 = ((($ws)) + 152|0);
    $231 = +HEAPF64[$230>>3];
    $232 = ((($ws)) + 160|0);
    $233 = +HEAPF64[$232>>3];
    $234 = $231 + $233;
    $235 = ((($ws)) + 224|0);
    $236 = +HEAPF64[$235>>3];
    $237 = $234 + $236;
    $238 = ((($ws)) + 248|0);
    $239 = +HEAPF64[$238>>3];
    $240 = $237 + $239;
    $241 = ((($ws)) + 296|0);
    $242 = +HEAPF64[$241>>3];
    $243 = $240 + $242;
    $244 = ((($ws)) + 312|0);
    HEAPF64[$244>>3] = $243;
    $245 = ((($ws)) + 8|0);
    $246 = +HEAPF64[$245>>3];
    $247 = ((($ws)) + 312|0);
    $248 = +HEAPF64[$247>>3];
    $249 = $246 - $248;
    $250 = ((($ws)) + 320|0);
    HEAPF64[$250>>3] = $249;
    $251 = ((($ws)) + 320|0);
    $252 = +HEAPF64[$251>>3];
    $253 = 0.28000000000000003 * $252;
    $254 = ((($ws)) + 328|0);
    HEAPF64[$254>>3] = $253;
   }
  }
 }
 $255 = ((($ws)) + 152|0);
 $256 = +HEAPF64[$255>>3];
 $257 = $0;
 $258 = (+_TaxRateFunction($256,$257));
 $259 = ((($ws)) + 336|0);
 HEAPF64[$259>>3] = $258;
 $260 = ((($ws)) + 232|0);
 $261 = +HEAPF64[$260>>3];
 $262 = ((($ws)) + 256|0);
 $263 = +HEAPF64[$262>>3];
 $264 = $261 + $263;
 $265 = ((($ws)) + 304|0);
 $266 = +HEAPF64[$265>>3];
 $267 = $264 + $266;
 $268 = ((($ws)) + 328|0);
 $269 = +HEAPF64[$268>>3];
 $270 = $267 + $269;
 $271 = ((($ws)) + 336|0);
 $272 = +HEAPF64[$271>>3];
 $273 = $270 + $272;
 $274 = ((($ws)) + 344|0);
 HEAPF64[$274>>3] = $273;
 $275 = ((($ws)) + 8|0);
 $276 = +HEAPF64[$275>>3];
 $277 = $0;
 $278 = (+_TaxRateFunction($276,$277));
 $279 = ((($ws)) + 352|0);
 HEAPF64[$279>>3] = $278;
 $280 = ((($ws)) + 344|0);
 $281 = +HEAPF64[$280>>3];
 $282 = ((($ws)) + 352|0);
 $283 = +HEAPF64[$282>>3];
 $284 = (+_smallerof($281,$283));
 $285 = ((($ws)) + 360|0);
 HEAPF64[$285>>3] = $284;
 $286 = ((($ws)) + 360|0);
 $287 = +HEAPF64[$286>>3];
 HEAPF64[(360)>>3] = $287;
 $k = 0;
 while(1) {
  $288 = $k;
  $289 = ($288|0)<(100);
  if (!($289)) {
   break;
  }
  $290 = $k;
  $291 = (($ws) + ($290<<3)|0);
  $292 = +HEAPF64[$291>>3];
  $293 = $k;
  $294 = (32640 + ($293<<3)|0);
  HEAPF64[$294>>3] = $292;
  $295 = $k;
  $296 = (($295) + 1)|0;
  $k = $296;
 }
 STACKTOP = sp;return;
}
function _SocSec_Worksheet() {
 var $0 = 0.0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0.0, $104 = 0, $105 = 0.0, $106 = 0.0, $107 = 0, $108 = 0, $109 = 0, $11 = 0.0, $110 = 0.0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0.0;
 var $116 = 0, $117 = 0.0, $118 = 0.0, $119 = 0.0, $12 = 0.0, $120 = 0, $121 = 0, $122 = 0.0, $123 = 0, $124 = 0.0, $125 = 0.0, $126 = 0, $127 = 0, $128 = 0.0, $129 = 0.0, $13 = 0, $130 = 0, $131 = 0, $132 = 0.0, $133 = 0;
 var $134 = 0.0, $135 = 0.0, $136 = 0, $137 = 0, $138 = 0.0, $139 = 0.0, $14 = 0.0, $140 = 0, $141 = 0, $142 = 0.0, $143 = 0, $144 = 0.0, $145 = 0.0, $146 = 0, $147 = 0, $148 = 0.0, $149 = 0.0, $15 = 0.0, $150 = 0, $151 = 0;
 var $152 = 0.0, $153 = 0, $154 = 0.0, $155 = 0.0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0.0, $160 = 0, $161 = 0, $162 = 0, $163 = 0.0, $164 = 0, $165 = 0, $166 = 0, $167 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0;
 var $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0, $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0;
 var $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0, $42 = 0.0, $43 = 0, $44 = 0, $45 = 0.0, $46 = 0, $47 = 0.0, $48 = 0.0, $49 = 0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0, $53 = 0, $54 = 0, $55 = 0;
 var $56 = 0.0, $57 = 0, $58 = 0, $59 = 0.0, $6 = 0, $60 = 0.0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0.0, $71 = 0, $72 = 0, $73 = 0;
 var $74 = 0.0, $75 = 0, $76 = 0.0, $77 = 0, $78 = 0, $79 = 0, $8 = 0.0, $80 = 0, $81 = 0.0, $82 = 0, $83 = 0.0, $84 = 0.0, $85 = 0, $86 = 0, $87 = 0, $88 = 0.0, $89 = 0, $9 = 0, $90 = 0, $91 = 0;
 var $92 = 0, $93 = 0, $94 = 0.0, $95 = 0, $96 = 0.0, $97 = 0, $98 = 0.0, $99 = 0, $k = 0, $vararg_buffer = 0, $vararg_buffer11 = 0, $vararg_buffer14 = 0, $vararg_buffer16 = 0, $vararg_buffer18 = 0, $vararg_buffer2 = 0, $vararg_buffer20 = 0, $vararg_buffer23 = 0, $vararg_buffer4 = 0, $vararg_buffer6 = 0, $vararg_buffer8 = 0;
 var $vararg_ptr1 = 0, $vararg_ptr26 = 0, $ws = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 912|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer23 = sp + 888|0;
 $vararg_buffer20 = sp + 880|0;
 $vararg_buffer18 = sp + 872|0;
 $vararg_buffer16 = sp + 864|0;
 $vararg_buffer14 = sp + 856|0;
 $vararg_buffer11 = sp + 848|0;
 $vararg_buffer8 = sp + 840|0;
 $vararg_buffer6 = sp + 832|0;
 $vararg_buffer4 = sp + 824|0;
 $vararg_buffer2 = sp + 816|0;
 $vararg_buffer = sp + 800|0;
 $ws = sp;
 $0 = +HEAPF64[(168)>>3];
 $1 = $0 == 0.0;
 if ($1) {
  STACKTOP = sp;return;
 }
 $k = 0;
 while(1) {
  $2 = $k;
  $3 = ($2|0)<(100);
  if (!($3)) {
   break;
  }
  $4 = $k;
  $5 = (($ws) + ($4<<3)|0);
  HEAPF64[$5>>3] = 0.0;
  $6 = $k;
  $7 = (($6) + 1)|0;
  $k = $7;
 }
 $8 = +HEAPF64[(168)>>3];
 $9 = ((($ws)) + 8|0);
 HEAPF64[$9>>3] = $8;
 $10 = ((($ws)) + 8|0);
 $11 = +HEAPF64[$10>>3];
 $12 = 0.5 * $11;
 $13 = ((($ws)) + 16|0);
 HEAPF64[$13>>3] = $12;
 $14 = +HEAPF64[(64)>>3];
 $15 = +HEAPF64[(72)>>3];
 $16 = $14 + $15;
 $17 = +HEAPF64[(80)>>3];
 $18 = $16 + $17;
 $19 = +HEAPF64[(88)>>3];
 $20 = $18 + $19;
 $21 = +HEAPF64[(96)>>3];
 $22 = $20 + $21;
 $23 = +HEAPF64[(104)>>3];
 $24 = $22 + $23;
 $25 = +HEAPF64[(112)>>3];
 $26 = $24 + $25;
 $27 = +HEAPF64[(120)>>3];
 $28 = $26 + $27;
 $29 = +HEAPF64[(128)>>3];
 $30 = $28 + $29;
 $31 = +HEAPF64[(136)>>3];
 $32 = $30 + $31;
 $33 = +HEAPF64[(144)>>3];
 $34 = $32 + $33;
 $35 = +HEAPF64[(152)>>3];
 $36 = $34 + $35;
 $37 = +HEAPF64[(160)>>3];
 $38 = $36 + $37;
 $39 = +HEAPF64[(176)>>3];
 $40 = $38 + $39;
 $41 = ((($ws)) + 24|0);
 HEAPF64[$41>>3] = $40;
 $42 = +HEAPF64[8008>>3];
 $43 = ((($ws)) + 32|0);
 HEAPF64[$43>>3] = $42;
 $44 = ((($ws)) + 16|0);
 $45 = +HEAPF64[$44>>3];
 $46 = ((($ws)) + 24|0);
 $47 = +HEAPF64[$46>>3];
 $48 = $45 + $47;
 $49 = ((($ws)) + 32|0);
 $50 = +HEAPF64[$49>>3];
 $51 = $48 + $50;
 $52 = ((($ws)) + 40|0);
 HEAPF64[$52>>3] = $51;
 $k = 23;
 while(1) {
  $53 = $k;
  $54 = ($53|0)<=(32);
  if (!($54)) {
   break;
  }
  $55 = ((($ws)) + 48|0);
  $56 = +HEAPF64[$55>>3];
  $57 = $k;
  $58 = (8 + ($57<<3)|0);
  $59 = +HEAPF64[$58>>3];
  $60 = $56 + $59;
  $61 = ((($ws)) + 48|0);
  HEAPF64[$61>>3] = $60;
  $62 = $k;
  $63 = (($62) + 1)|0;
  $k = $63;
 }
 $k = 0;
 while(1) {
  $64 = $k;
  $65 = ($64|0)<=(6);
  if (!($65)) {
   break;
  }
  $66 = HEAP32[56672>>2]|0;
  $67 = $k;
  $68 = $k;
  $69 = (($ws) + ($68<<3)|0);
  $70 = +HEAPF64[$69>>3];
  HEAP32[$vararg_buffer>>2] = $67;
  $vararg_ptr1 = ((($vararg_buffer)) + 8|0);
  HEAPF64[$vararg_ptr1>>3] = $70;
  (_fprintf($66,61428,$vararg_buffer)|0);
  $71 = $k;
  $72 = (($71) + 1)|0;
  $k = $72;
 }
 $73 = ((($ws)) + 48|0);
 $74 = +HEAPF64[$73>>3];
 $75 = ((($ws)) + 40|0);
 $76 = +HEAPF64[$75>>3];
 $77 = $74 >= $76;
 if ($77) {
  HEAPF64[(168)>>3] = 0.0;
  $78 = HEAP32[56672>>2]|0;
  (_fprintf($78,61458,$vararg_buffer2)|0);
  (_printf(61491,$vararg_buffer4)|0);
  $79 = HEAP32[56672>>2]|0;
  (_fprintf($79,61491,$vararg_buffer6)|0);
  STACKTOP = sp;return;
 }
 $80 = ((($ws)) + 40|0);
 $81 = +HEAPF64[$80>>3];
 $82 = ((($ws)) + 48|0);
 $83 = +HEAPF64[$82>>3];
 $84 = $81 - $83;
 $85 = ((($ws)) + 56|0);
 HEAPF64[$85>>3] = $84;
 $86 = HEAP32[56672>>2]|0;
 $87 = ((($ws)) + 56|0);
 $88 = +HEAPF64[$87>>3];
 HEAPF64[$vararg_buffer8>>3] = $88;
 (_fprintf($86,61543,$vararg_buffer8)|0);
 $89 = HEAP32[56708>>2]|0;
 $90 = ($89|0)==(2);
 $91 = ((($ws)) + 64|0);
 if ($90) {
  HEAPF64[$91>>3] = 32000.0;
 } else {
  HEAPF64[$91>>3] = 25000.0;
 }
 $92 = HEAP32[56672>>2]|0;
 $93 = ((($ws)) + 64|0);
 $94 = +HEAPF64[$93>>3];
 HEAPF64[$vararg_buffer11>>3] = $94;
 (_fprintf($92,61587,$vararg_buffer11)|0);
 $95 = ((($ws)) + 64|0);
 $96 = +HEAPF64[$95>>3];
 $97 = ((($ws)) + 56|0);
 $98 = +HEAPF64[$97>>3];
 $99 = $96 >= $98;
 if ($99) {
  HEAPF64[(168)>>3] = 0.0;
  $100 = HEAP32[56672>>2]|0;
  (_fprintf($100,61616,$vararg_buffer14)|0);
  (_printf(61491,$vararg_buffer16)|0);
  $101 = HEAP32[56672>>2]|0;
  (_fprintf($101,61491,$vararg_buffer18)|0);
  STACKTOP = sp;return;
 }
 $102 = ((($ws)) + 56|0);
 $103 = +HEAPF64[$102>>3];
 $104 = ((($ws)) + 64|0);
 $105 = +HEAPF64[$104>>3];
 $106 = $103 - $105;
 $107 = ((($ws)) + 72|0);
 HEAPF64[$107>>3] = $106;
 $108 = HEAP32[56672>>2]|0;
 $109 = ((($ws)) + 72|0);
 $110 = +HEAPF64[$109>>3];
 HEAPF64[$vararg_buffer20>>3] = $110;
 (_fprintf($108,61649,$vararg_buffer20)|0);
 $111 = HEAP32[56708>>2]|0;
 $112 = ($111|0)==(2);
 $113 = ((($ws)) + 80|0);
 if ($112) {
  HEAPF64[$113>>3] = 12000.0;
 } else {
  HEAPF64[$113>>3] = 9000.0;
 }
 $114 = ((($ws)) + 72|0);
 $115 = +HEAPF64[$114>>3];
 $116 = ((($ws)) + 80|0);
 $117 = +HEAPF64[$116>>3];
 $118 = $115 - $117;
 $119 = (+_NotLessThanZero($118));
 $120 = ((($ws)) + 88|0);
 HEAPF64[$120>>3] = $119;
 $121 = ((($ws)) + 72|0);
 $122 = +HEAPF64[$121>>3];
 $123 = ((($ws)) + 80|0);
 $124 = +HEAPF64[$123>>3];
 $125 = (+_smallerof($122,$124));
 $126 = ((($ws)) + 96|0);
 HEAPF64[$126>>3] = $125;
 $127 = ((($ws)) + 96|0);
 $128 = +HEAPF64[$127>>3];
 $129 = $128 / 2.0;
 $130 = ((($ws)) + 104|0);
 HEAPF64[$130>>3] = $129;
 $131 = ((($ws)) + 16|0);
 $132 = +HEAPF64[$131>>3];
 $133 = ((($ws)) + 104|0);
 $134 = +HEAPF64[$133>>3];
 $135 = (+_smallerof($132,$134));
 $136 = ((($ws)) + 112|0);
 HEAPF64[$136>>3] = $135;
 $137 = ((($ws)) + 88|0);
 $138 = +HEAPF64[$137>>3];
 $139 = 0.84999999999999998 * $138;
 $140 = ((($ws)) + 120|0);
 HEAPF64[$140>>3] = $139;
 $141 = ((($ws)) + 112|0);
 $142 = +HEAPF64[$141>>3];
 $143 = ((($ws)) + 120|0);
 $144 = +HEAPF64[$143>>3];
 $145 = $142 + $144;
 $146 = ((($ws)) + 128|0);
 HEAPF64[$146>>3] = $145;
 $147 = ((($ws)) + 8|0);
 $148 = +HEAPF64[$147>>3];
 $149 = 0.84999999999999998 * $148;
 $150 = ((($ws)) + 136|0);
 HEAPF64[$150>>3] = $149;
 $151 = ((($ws)) + 128|0);
 $152 = +HEAPF64[$151>>3];
 $153 = ((($ws)) + 136|0);
 $154 = +HEAPF64[$153>>3];
 $155 = (+_smallerof($152,$154));
 $156 = ((($ws)) + 144|0);
 HEAPF64[$156>>3] = $155;
 $k = 10;
 while(1) {
  $157 = $k;
  $158 = ($157|0)<=(18);
  if (!($158)) {
   break;
  }
  $159 = HEAP32[56672>>2]|0;
  $160 = $k;
  $161 = $k;
  $162 = (($ws) + ($161<<3)|0);
  $163 = +HEAPF64[$162>>3];
  HEAP32[$vararg_buffer23>>2] = $160;
  $vararg_ptr26 = ((($vararg_buffer23)) + 8|0);
  HEAPF64[$vararg_ptr26>>3] = $163;
  (_fprintf($159,61428,$vararg_buffer23)|0);
  $164 = $k;
  $165 = (($164) + 1)|0;
  $k = $165;
 }
 $166 = ((($ws)) + 144|0);
 $167 = +HEAPF64[$166>>3];
 HEAPF64[(168)>>3] = $167;
 STACKTOP = sp;return;
}
function _main($argc,$argv) {
 $argc = $argc|0;
 $argv = $argv|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0.0, $101 = 0, $102 = 0.0, $103 = 0, $104 = 0.0, $105 = 0.0, $106 = 0.0, $107 = 0.0, $108 = 0.0, $109 = 0.0, $11 = 0, $110 = 0.0, $111 = 0.0, $112 = 0.0, $113 = 0.0, $114 = 0.0, $115 = 0.0;
 var $116 = 0.0, $117 = 0.0, $118 = 0.0, $119 = 0.0, $12 = 0, $120 = 0.0, $121 = 0, $122 = 0, $123 = 0.0, $124 = 0, $125 = 0.0, $126 = 0.0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0.0, $133 = 0;
 var $134 = 0.0, $135 = 0, $136 = 0, $137 = 0.0, $138 = 0, $139 = 0.0, $14 = 0, $140 = 0.0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0.0, $146 = 0.0, $147 = 0, $148 = 0.0, $149 = 0, $15 = 0, $150 = 0, $151 = 0.0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0.0, $156 = 0, $157 = 0.0, $158 = 0.0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0.0, $163 = 0, $164 = 0.0, $165 = 0.0, $166 = 0, $167 = 0, $168 = 0.0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0.0, $172 = 0, $173 = 0, $174 = 0.0, $175 = 0.0, $176 = 0, $177 = 0, $178 = 0.0, $179 = 0.0, $18 = 0, $180 = 0.0, $181 = 0.0, $182 = 0, $183 = 0.0, $184 = 0, $185 = 0.0, $186 = 0, $187 = 0, $188 = 0.0;
 var $189 = 0.0, $19 = 0, $190 = 0, $191 = 0, $192 = 0.0, $193 = 0.0, $194 = 0.0, $195 = 0.0, $196 = 0.0, $197 = 0.0, $198 = 0.0, $199 = 0.0, $2 = 0, $20 = 0, $200 = 0.0, $201 = 0.0, $202 = 0.0, $203 = 0.0, $204 = 0.0, $205 = 0.0;
 var $206 = 0.0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0.0, $211 = 0.0, $212 = 0, $213 = 0.0, $214 = 0.0, $215 = 0, $216 = 0.0, $217 = 0, $218 = 0.0, $219 = 0, $22 = 0, $220 = 0.0, $221 = 0, $222 = 0, $223 = 0.0;
 var $224 = 0, $225 = 0.0, $226 = 0, $227 = 0, $228 = 0.0, $229 = 0, $23 = 0.0, $230 = 0.0, $231 = 0.0, $232 = 0.0, $233 = 0.0, $234 = 0.0, $235 = 0, $236 = 0.0, $237 = 0.0, $238 = 0.0, $239 = 0, $24 = 0.0, $240 = 0, $241 = 0.0;
 var $242 = 0.0, $243 = 0.0, $244 = 0.0, $245 = 0, $246 = 0, $247 = 0.0, $248 = 0, $249 = 0.0, $25 = 0, $250 = 0.0, $251 = 0, $252 = 0, $253 = 0.0, $254 = 0, $255 = 0.0, $256 = 0.0, $257 = 0, $258 = 0, $259 = 0.0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0.0, $267 = 0, $268 = 0, $269 = 0.0, $27 = 0, $270 = 0.0, $271 = 0.0, $272 = 0.0, $273 = 0.0, $274 = 0.0, $275 = 0.0, $276 = 0.0, $277 = 0.0, $278 = 0.0;
 var $279 = 0.0, $28 = 0, $280 = 0.0, $281 = 0.0, $282 = 0.0, $283 = 0.0, $284 = 0.0, $285 = 0.0, $286 = 0.0, $287 = 0.0, $288 = 0.0, $289 = 0.0, $29 = 0, $290 = 0.0, $291 = 0.0, $292 = 0.0, $293 = 0.0, $294 = 0.0, $295 = 0, $296 = 0;
 var $297 = 0.0, $298 = 0, $299 = 0, $3 = 0.0, $30 = 0, $300 = 0.0, $301 = 0.0, $302 = 0.0, $303 = 0.0, $304 = 0.0, $305 = 0.0, $306 = 0.0, $307 = 0.0, $308 = 0.0, $309 = 0.0, $31 = 0, $310 = 0.0, $311 = 0.0, $312 = 0.0, $313 = 0.0;
 var $314 = 0.0, $315 = 0.0, $316 = 0.0, $317 = 0.0, $318 = 0.0, $319 = 0.0, $32 = 0, $320 = 0.0, $321 = 0.0, $322 = 0.0, $323 = 0.0, $324 = 0.0, $325 = 0.0, $326 = 0, $327 = 0.0, $328 = 0.0, $329 = 0.0, $33 = 0, $330 = 0.0, $331 = 0.0;
 var $332 = 0.0, $333 = 0.0, $334 = 0.0, $335 = 0, $336 = 0.0, $337 = 0.0, $338 = 0.0, $339 = 0.0, $34 = 0, $340 = 0.0, $341 = 0.0, $342 = 0.0, $343 = 0.0, $344 = 0.0, $345 = 0, $346 = 0.0, $347 = 0.0, $348 = 0.0, $349 = 0.0, $35 = 0;
 var $350 = 0.0, $351 = 0.0, $352 = 0.0, $353 = 0.0, $354 = 0.0, $355 = 0.0, $356 = 0.0, $357 = 0.0, $358 = 0.0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0.0, $365 = 0, $366 = 0, $367 = 0, $368 = 0;
 var $369 = 0.0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0.0, $375 = 0, $376 = 0, $377 = 0.0, $378 = 0.0, $379 = 0, $38 = 0, $380 = 0.0, $381 = 0, $382 = 0.0, $383 = 0, $384 = 0, $385 = 0.0, $386 = 0.0;
 var $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0.0, $391 = 0.0, $392 = 0, $393 = 0.0, $394 = 0, $395 = 0, $396 = 0, $397 = 0.0, $398 = 0.0, $399 = 0, $4 = 0.0, $40 = 0, $400 = 0.0, $401 = 0, $402 = 0, $403 = 0;
 var $404 = 0, $405 = 0, $406 = 0.0, $407 = 0.0, $408 = 0, $409 = 0.0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0.0, $414 = 0.0, $415 = 0, $416 = 0.0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0;
 var $422 = 0.0, $423 = 0.0, $424 = 0.0, $425 = 0.0, $426 = 0.0, $427 = 0, $428 = 0.0, $429 = 0.0, $43 = 0, $430 = 0, $431 = 0.0, $432 = 0, $433 = 0.0, $434 = 0, $435 = 0, $436 = 0.0, $437 = 0, $438 = 0.0, $439 = 0.0, $44 = 0;
 var $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0.0, $445 = 0.0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0.0, $451 = 0.0, $452 = 0.0, $453 = 0, $454 = 0.0, $455 = 0.0, $456 = 0, $457 = 0, $458 = 0.0;
 var $459 = 0, $46 = 0, $460 = 0, $461 = 0.0, $462 = 0.0, $463 = 0, $464 = 0, $465 = 0.0, $466 = 0, $467 = 0.0, $468 = 0.0, $469 = 0, $47 = 0, $470 = 0, $471 = 0.0, $472 = 0, $473 = 0.0, $474 = 0.0, $475 = 0, $476 = 0;
 var $477 = 0.0, $478 = 0.0, $479 = 0.0, $48 = 0, $480 = 0.0, $481 = 0.0, $482 = 0.0, $483 = 0, $484 = 0.0, $485 = 0.0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0.0, $492 = 0, $493 = 0.0, $494 = 0;
 var $495 = 0.0, $496 = 0, $497 = 0.0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0.0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0.0, $509 = 0, $51 = 0, $510 = 0.0, $511 = 0.0;
 var $512 = 0, $513 = 0, $514 = 0.0, $515 = 0.0, $516 = 0, $517 = 0.0, $518 = 0.0, $519 = 0.0, $52 = 0, $520 = 0.0, $521 = 0.0, $522 = 0, $523 = 0, $524 = 0.0, $525 = 0, $526 = 0, $527 = 0.0, $528 = 0.0, $529 = 0, $53 = 0;
 var $530 = 0, $531 = 0.0, $532 = 0.0, $533 = 0.0, $534 = 0.0, $535 = 0.0, $536 = 0, $537 = 0, $538 = 0.0, $539 = 0.0, $54 = 0.0, $540 = 0, $541 = 0, $542 = 0.0, $543 = 0.0, $544 = 0.0, $545 = 0.0, $546 = 0, $547 = 0, $548 = 0.0;
 var $549 = 0, $55 = 0, $550 = 0, $551 = 0.0, $552 = 0.0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0.0, $558 = 0, $559 = 0, $56 = 0.0, $560 = 0.0, $561 = 0.0, $562 = 0, $563 = 0, $564 = 0.0, $565 = 0.0, $566 = 0;
 var $567 = 0.0, $568 = 0.0, $569 = 0.0, $57 = 0, $570 = 0, $571 = 0.0, $572 = 0, $573 = 0.0, $574 = 0.0, $575 = 0.0, $576 = 0.0, $577 = 0, $578 = 0.0, $579 = 0, $58 = 0.0, $580 = 0.0, $581 = 0.0, $582 = 0.0, $583 = 0.0, $584 = 0;
 var $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0;
 var $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $61 = 0, $62 = 0.0, $63 = 0, $64 = 0.0, $65 = 0, $66 = 0.0, $67 = 0, $68 = 0, $69 = 0.0, $7 = 0, $70 = 0, $71 = 0, $72 = 0.0, $73 = 0.0;
 var $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0.0;
 var $92 = 0.0, $93 = 0, $94 = 0.0, $95 = 0.0, $96 = 0, $97 = 0.0, $98 = 0, $99 = 0.0, $HH_STD_DEDUC = 0.0, $MFJ_STD_DEDUC = 0.0, $MFS_STD_DEDUC = 0.0, $S_STD_DEDUC = 0.0, $Spouse1stName = 0, $SpouseLastName = 0, $Your1stName = 0, $YourLastName = 0, $dedexws = 0, $exemption_threshold = 0.0, $itemize = 0, $j = 0;
 var $j2 = 0, $mult4 = 0.0, $mult5 = 0.0, $now = 0, $or$cond = 0, $or$cond11 = 0, $or$cond13 = 0, $or$cond3 = 0, $or$cond5 = 0, $or$cond7 = 0, $or$cond9 = 0, $thresh = 0.0, $threshA = 0.0, $threshB = 0.0, $vararg_buffer = 0, $vararg_buffer100 = 0, $vararg_buffer102 = 0, $vararg_buffer104 = 0, $vararg_buffer106 = 0, $vararg_buffer108 = 0;
 var $vararg_buffer110 = 0, $vararg_buffer112 = 0, $vararg_buffer114 = 0, $vararg_buffer116 = 0, $vararg_buffer118 = 0, $vararg_buffer120 = 0, $vararg_buffer123 = 0, $vararg_buffer126 = 0, $vararg_buffer129 = 0, $vararg_buffer132 = 0, $vararg_buffer135 = 0, $vararg_buffer138 = 0, $vararg_buffer14 = 0, $vararg_buffer140 = 0, $vararg_buffer145 = 0, $vararg_buffer151 = 0, $vararg_buffer19 = 0, $vararg_buffer22 = 0, $vararg_buffer25 = 0, $vararg_buffer29 = 0;
 var $vararg_buffer32 = 0, $vararg_buffer35 = 0, $vararg_buffer38 = 0, $vararg_buffer41 = 0, $vararg_buffer43 = 0, $vararg_buffer46 = 0, $vararg_buffer49 = 0, $vararg_buffer52 = 0, $vararg_buffer56 = 0, $vararg_buffer58 = 0, $vararg_buffer60 = 0, $vararg_buffer63 = 0, $vararg_buffer66 = 0, $vararg_buffer70 = 0, $vararg_buffer73 = 0, $vararg_buffer75 = 0, $vararg_buffer78 = 0, $vararg_buffer80 = 0, $vararg_buffer84 = 0, $vararg_buffer88 = 0;
 var $vararg_buffer91 = 0, $vararg_buffer94 = 0, $vararg_buffer96 = 0, $vararg_buffer98 = 0, $vararg_ptr143 = 0, $vararg_ptr144 = 0, $vararg_ptr148 = 0, $vararg_ptr149 = 0, $vararg_ptr150 = 0, $vararg_ptr154 = 0, $vararg_ptr17 = 0, $vararg_ptr18 = 0, $vararg_ptr28 = 0, $vararg_ptr55 = 0, $vararg_ptr69 = 0, $vararg_ptr83 = 0, $vararg_ptr87 = 0, $word = 0, $ws = 0, $ws1 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 3072|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer151 = sp + 1016|0;
 $vararg_buffer145 = sp + 1000|0;
 $vararg_buffer140 = sp + 984|0;
 $vararg_buffer138 = sp + 976|0;
 $vararg_buffer135 = sp + 968|0;
 $vararg_buffer132 = sp + 960|0;
 $vararg_buffer129 = sp + 952|0;
 $vararg_buffer126 = sp + 944|0;
 $vararg_buffer123 = sp + 936|0;
 $vararg_buffer120 = sp + 928|0;
 $vararg_buffer118 = sp + 920|0;
 $vararg_buffer116 = sp + 912|0;
 $vararg_buffer114 = sp + 904|0;
 $vararg_buffer112 = sp + 896|0;
 $vararg_buffer110 = sp + 888|0;
 $vararg_buffer108 = sp + 880|0;
 $vararg_buffer106 = sp + 872|0;
 $vararg_buffer104 = sp + 864|0;
 $vararg_buffer102 = sp + 856|0;
 $vararg_buffer100 = sp + 848|0;
 $vararg_buffer98 = sp + 840|0;
 $vararg_buffer96 = sp + 832|0;
 $vararg_buffer94 = sp + 824|0;
 $vararg_buffer91 = sp + 816|0;
 $vararg_buffer88 = sp + 808|0;
 $vararg_buffer84 = sp + 792|0;
 $vararg_buffer80 = sp + 776|0;
 $vararg_buffer78 = sp + 768|0;
 $vararg_buffer75 = sp + 760|0;
 $vararg_buffer73 = sp + 752|0;
 $vararg_buffer70 = sp + 744|0;
 $vararg_buffer66 = sp + 728|0;
 $vararg_buffer63 = sp + 720|0;
 $vararg_buffer60 = sp + 712|0;
 $vararg_buffer58 = sp + 704|0;
 $vararg_buffer56 = sp + 696|0;
 $vararg_buffer52 = sp + 680|0;
 $vararg_buffer49 = sp + 672|0;
 $vararg_buffer46 = sp + 664|0;
 $vararg_buffer43 = sp + 656|0;
 $vararg_buffer41 = sp + 648|0;
 $vararg_buffer38 = sp + 640|0;
 $vararg_buffer35 = sp + 632|0;
 $vararg_buffer32 = sp + 624|0;
 $vararg_buffer29 = sp + 616|0;
 $vararg_buffer25 = sp + 608|0;
 $vararg_buffer22 = sp + 600|0;
 $vararg_buffer19 = sp + 592|0;
 $vararg_buffer14 = sp + 568|0;
 $vararg_buffer = sp + 560|0;
 $word = sp + 1072|0;
 $now = sp + 1044|0;
 $dedexws = sp + 392|0;
 $ws = sp + 200|0;
 $ws1 = sp + 8|0;
 $0 = 0;
 $1 = $argc;
 $2 = $argv;
 $itemize = 0;
 $exemption_threshold = 0.0;
 $3 = +HEAPF32[56664>>2];
 $4 = $3;
 HEAPF64[$vararg_buffer>>3] = $4;
 (_printf(61693,$vararg_buffer)|0);
 $5 = HEAP32[56968>>2]|0;
 HEAP32[56672>>2] = $5;
 $j = 0;
 while(1) {
  $6 = $j;
  $7 = ($6|0)<(1000);
  if (!($7)) {
   break;
  }
  $8 = $j;
  $9 = (8 + ($8<<3)|0);
  HEAPF64[$9>>3] = 0.0;
  $10 = $j;
  $11 = (8640 + ($10<<3)|0);
  HEAPF64[$11>>3] = 0.0;
  $12 = $j;
  $13 = (16640 + ($12<<3)|0);
  HEAPF64[$13>>3] = 0.0;
  $14 = $j;
  $15 = (24640 + ($14<<3)|0);
  HEAPF64[$15>>3] = 0.0;
  $16 = $j;
  $17 = (32640 + ($16<<3)|0);
  HEAPF64[$17>>3] = 0.0;
  $18 = $j;
  $19 = (($18) + 1)|0;
  $j = $19;
 }
 $20 = HEAP32[56668>>2]|0;
 _read_line($20,$word);
 $21 = (_time((0|0))|0);
 HEAP32[$now>>2] = $21;
 $22 = HEAP32[56672>>2]|0;
 $23 = +HEAPF32[56664>>2];
 $24 = $23;
 $25 = (_ctime(($now|0))|0);
 HEAP32[$vararg_buffer14>>2] = $word;
 $vararg_ptr17 = ((($vararg_buffer14)) + 8|0);
 HEAPF64[$vararg_ptr17>>3] = $24;
 $vararg_ptr18 = ((($vararg_buffer14)) + 16|0);
 HEAP32[$vararg_ptr18>>2] = $25;
 (_fprintf($22,61716,$vararg_buffer14)|0);
 _GetLineS(61734,$word);
 $26 = (_strncasecmp($word,61742,4)|0);
 $27 = ($26|0)==(0);
 do {
  if ($27) {
   HEAP32[56708>>2] = 1;
  } else {
   $28 = (_strncasecmp($word,61749,13)|0);
   $29 = ($28|0)==(0);
   if ($29) {
    HEAP32[56708>>2] = 2;
    break;
   }
   $30 = (_strncasecmp($word,61763,11)|0);
   $31 = ($30|0)==(0);
   if ($31) {
    HEAP32[56708>>2] = 3;
    break;
   }
   $32 = (_strncasecmp($word,61775,4)|0);
   $33 = ($32|0)==(0);
   if ($33) {
    HEAP32[56708>>2] = 4;
    break;
   }
   $34 = (_strncasecmp($word,61789,4)|0);
   $35 = ($34|0)==(0);
   if ($35) {
    HEAP32[56708>>2] = 5;
    break;
   } else {
    HEAP32[$vararg_buffer19>>2] = $word;
    (_printf(61795,$vararg_buffer19)|0);
    $36 = HEAP32[56672>>2]|0;
    HEAP32[$vararg_buffer22>>2] = $word;
    (_fprintf($36,61795,$vararg_buffer22)|0);
    _exit(1);
    // unreachable;
   }
  }
 } while(0);
 $37 = HEAP32[56672>>2]|0;
 $38 = HEAP32[56708>>2]|0;
 HEAP32[$vararg_buffer25>>2] = $word;
 $vararg_ptr28 = ((($vararg_buffer25)) + 4|0);
 HEAP32[$vararg_ptr28>>2] = $38;
 (_fprintf($37,61838,$vararg_buffer25)|0);
 _GetLineS(61856,$word);
 $39 = (_strncasecmp($word,61865,1)|0);
 $40 = ($39|0)==(0);
 do {
  if ($40) {
   $41 = HEAP32[56708>>2]|0;
   $42 = ($41|0)==(2);
   if ($42) {
    HEAP32[56700>>2] = 2;
    break;
   } else {
    HEAP32[56700>>2] = 1;
    break;
   }
  } else {
   $43 = (_strncasecmp($word,61869,1)|0);
   $44 = ($43|0)==(0);
   if ($44) {
    HEAP32[56700>>2] = 0;
    break;
   }
   HEAP32[$vararg_buffer29>>2] = 56700;
   $45 = (_sscanf($word,57789,$vararg_buffer29)|0);
   $46 = ($45|0)!=(1);
   $47 = HEAP32[56700>>2]|0;
   $48 = ($47|0)<(0);
   $or$cond = $46 | $48;
   $49 = HEAP32[56700>>2]|0;
   $50 = ($49|0)>(2);
   $or$cond3 = $or$cond | $50;
   if ($or$cond3) {
    HEAP32[$vararg_buffer32>>2] = $word;
    (_printf(61872,$vararg_buffer32)|0);
    $51 = HEAP32[56672>>2]|0;
    HEAP32[$vararg_buffer35>>2] = $word;
    (_fprintf($51,61872,$vararg_buffer35)|0);
    _exit(1);
    // unreachable;
   }
  }
 } while(0);
 $52 = HEAP32[56672>>2]|0;
 $53 = HEAP32[56700>>2]|0;
 HEAP32[$vararg_buffer38>>2] = $53;
 (_fprintf($52,61931,$vararg_buffer38)|0);
 _GetLine1(61948,(56));
 _shownum(6);
 _GetLineF(61959,(64));
 _GetLineF(61962,(72));
 _GetLineFnz(61966,8008);
 _GetLineF(61970,(80));
 _GetLineF(61973,8016);
 $54 = +HEAPF64[8016>>3];
 $55 = $54 > 0.0;
 if ($55) {
  HEAP32[56692>>2] = 1;
 }
 $56 = +HEAPF64[(72)>>3];
 $57 = $56 != 0.0;
 $58 = +HEAPF64[(80)>>3];
 $59 = $58 != 0.0;
 $or$cond5 = $57 | $59;
 if ($or$cond5) {
  $60 = HEAP32[56672>>2]|0;
  (_fprintf($60,61977,$vararg_buffer41)|0);
  $61 = HEAP32[56672>>2]|0;
  $62 = +HEAPF64[(72)>>3];
  HEAPF64[$vararg_buffer43>>3] = $62;
  (_fprintf($61,61991,$vararg_buffer43)|0);
  $63 = HEAP32[56672>>2]|0;
  $64 = +HEAPF64[(72)>>3];
  HEAPF64[$vararg_buffer46>>3] = $64;
  (_fprintf($63,62005,$vararg_buffer46)|0);
  $65 = HEAP32[56672>>2]|0;
  $66 = +HEAPF64[(80)>>3];
  HEAPF64[$vararg_buffer49>>3] = $66;
  (_fprintf($65,62019,$vararg_buffer49)|0);
 }
 _GetLineF(62033,(88));
 _GetLineF(62037,(96));
 _GetLineF(62041,(104));
 _get_cap_gains(62045);
 _showline(13);
 _GetLine(62049,(120));
 _ShowLineNonZero(14);
 _GetLine(62053,(128));
 _ShowLineNonZero(15);
 _GetLine(62058,(136));
 _ShowLineNonZero(16);
 _GetLine(62063,(144));
 _ShowLineNonZero(17);
 _GetLine(62067,(152));
 _ShowLineNonZero(18);
 _GetLine(62071,(160));
 _ShowLineNonZero(19);
 _GetLineFnz(62075,(168));
 _GetLine(62080,(176));
 _GetLine(62084,(192));
 _GetLine(62088,(200));
 _GetLine(62092,(208));
 _GetLine(62096,(216));
 _GetLine(62100,(224));
 _GetLine(62104,(232));
 _GetLine(62108,(240));
 _GetLine(62112,(248));
 _GetLine(62116,(256));
 _GetLine(62121,(264));
 _GetLine(62125,(272));
 _GetLine(62129,(280));
 _GetLine(62133,(288));
 _SocSec_Worksheet();
 _ShowLineNonZero(20);
 _ShowLineNonZero(21);
 $j = 7;
 while(1) {
  $67 = $j;
  $68 = ($67|0)<=(21);
  if (!($68)) {
   break;
  }
  $69 = +HEAPF64[(184)>>3];
  $70 = $j;
  $71 = (8 + ($70<<3)|0);
  $72 = +HEAPF64[$71>>3];
  $73 = $69 + $72;
  HEAPF64[(184)>>3] = $73;
  $74 = $j;
  $75 = (($74) + 1)|0;
  $j = $75;
 }
 _showline_wmsg(22,62137);
 $76 = HEAP32[56700>>2]|0;
 $77 = ($76|0)==(0);
 if ($77) {
  HEAP32[56704>>2] = 1;
 }
 $78 = HEAP32[56708>>2]|0;
 L45: do {
  switch ($78|0) {
  case 1:  {
   $79 = HEAP32[56700>>2]|0;
   $80 = ($79|0)!=(0);
   if ($80) {
    $exemption_threshold = 10350.0;
    break L45;
   } else {
    $exemption_threshold = 11900.0;
    break L45;
   }
   break;
  }
  case 2:  {
   $81 = HEAP32[56700>>2]|0;
   $82 = ($81|0)==(2);
   do {
    if ($82) {
     $exemption_threshold = 20700.0;
    } else {
     $83 = HEAP32[56700>>2]|0;
     $84 = ($83|0)==(1);
     if ($84) {
      $exemption_threshold = 21950.0;
      break;
     } else {
      $exemption_threshold = 23200.0;
      break;
     }
    }
   } while(0);
   $85 = HEAP32[56700>>2]|0;
   $86 = ($85|0)!=(2);
   if ($86) {
    HEAP32[56704>>2] = 1;
   }
   break;
  }
  case 3:  {
   $exemption_threshold = 4050.0;
   break;
  }
  case 4:  {
   $87 = HEAP32[56700>>2]|0;
   $88 = ($87|0)!=(0);
   if ($88) {
    $exemption_threshold = 13350.0;
    break L45;
   } else {
    $exemption_threshold = 14900.0;
    break L45;
   }
   break;
  }
  case 5:  {
   $89 = HEAP32[56700>>2]|0;
   $90 = ($89|0)!=(0);
   if ($90) {
    $exemption_threshold = 16650.0;
    break L45;
   } else {
    $exemption_threshold = 17900.0;
    break L45;
   }
   break;
  }
  default: {
  }
  }
 } while(0);
 $91 = +HEAPF64[(184)>>3];
 $92 = $exemption_threshold;
 $93 = $91 < $92;
 if ($93) {
  $94 = +HEAPF64[(184)>>3];
  $95 = $exemption_threshold;
  HEAPF64[$vararg_buffer52>>3] = $94;
  $vararg_ptr55 = ((($vararg_buffer52)) + 8|0);
  HEAPF64[$vararg_ptr55>>3] = $95;
  (_printf(62150,$vararg_buffer52)|0);
  (_printf(62186,$vararg_buffer56)|0);
  $96 = HEAP32[56672>>2]|0;
  (_fprintf($96,62186,$vararg_buffer58)|0);
 }
 _ShowLineNonZero(23);
 _ShowLineNonZero(24);
 $97 = +HEAPF64[(272)>>3];
 $98 = $97 != 0.0;
 if ($98) {
  $99 = +HEAPF64[(272)>>3];
  $100 = (+_smallerof($99,2500.0));
  $101 = ((($ws)) + 8|0);
  HEAPF64[$101>>3] = $100;
  $102 = +HEAPF64[(184)>>3];
  $103 = ((($ws)) + 16|0);
  HEAPF64[$103>>3] = $102;
  $104 = +HEAPF64[(192)>>3];
  $105 = +HEAPF64[(200)>>3];
  $106 = $104 + $105;
  $107 = +HEAPF64[(208)>>3];
  $108 = $106 + $107;
  $109 = +HEAPF64[(216)>>3];
  $110 = $108 + $109;
  $111 = +HEAPF64[(224)>>3];
  $112 = $110 + $111;
  $113 = +HEAPF64[(240)>>3];
  $114 = $112 + $113;
  $115 = +HEAPF64[(248)>>3];
  $116 = $114 + $115;
  $117 = +HEAPF64[(256)>>3];
  $118 = $116 + $117;
  $119 = +HEAPF64[(264)>>3];
  $120 = $118 + $119;
  $121 = ((($ws)) + 24|0);
  HEAPF64[$121>>3] = $120;
  $122 = ((($ws)) + 16|0);
  $123 = +HEAPF64[$122>>3];
  $124 = ((($ws)) + 24|0);
  $125 = +HEAPF64[$124>>3];
  $126 = $123 - $125;
  $127 = ((($ws)) + 32|0);
  HEAPF64[$127>>3] = $126;
  $128 = HEAP32[56708>>2]|0;
  $129 = ($128|0)==(2);
  $130 = ((($ws)) + 40|0);
  if ($129) {
   HEAPF64[$130>>3] = 1.3E+5;
  } else {
   HEAPF64[$130>>3] = 65000.0;
  }
  $131 = ((($ws)) + 32|0);
  $132 = +HEAPF64[$131>>3];
  $133 = ((($ws)) + 40|0);
  $134 = +HEAPF64[$133>>3];
  $135 = $132 > $134;
  if ($135) {
   $136 = ((($ws)) + 32|0);
   $137 = +HEAPF64[$136>>3];
   $138 = ((($ws)) + 40|0);
   $139 = +HEAPF64[$138>>3];
   $140 = $137 - $139;
   $141 = ((($ws)) + 48|0);
   HEAPF64[$141>>3] = $140;
   $142 = HEAP32[56708>>2]|0;
   $143 = ($142|0)==(2);
   $144 = ((($ws)) + 48|0);
   $145 = +HEAPF64[$144>>3];
   if ($143) {
    $146 = $145 / 3.0E+4;
    $147 = ((($ws)) + 56|0);
    HEAPF64[$147>>3] = $146;
   } else {
    $148 = $145 / 15000.0;
    $149 = ((($ws)) + 56|0);
    HEAPF64[$149>>3] = $148;
   }
   $150 = ((($ws)) + 56|0);
   $151 = +HEAPF64[$150>>3];
   $152 = $151 >= 1.0;
   if ($152) {
    $153 = ((($ws)) + 56|0);
    HEAPF64[$153>>3] = 1.0;
   }
   $154 = ((($ws)) + 8|0);
   $155 = +HEAPF64[$154>>3];
   $156 = ((($ws)) + 56|0);
   $157 = +HEAPF64[$156>>3];
   $158 = $155 * $157;
   $159 = ((($ws)) + 64|0);
   HEAPF64[$159>>3] = $158;
  } else {
   $160 = ((($ws)) + 64|0);
   HEAPF64[$160>>3] = 0.0;
  }
  $161 = ((($ws)) + 8|0);
  $162 = +HEAPF64[$161>>3];
  $163 = ((($ws)) + 64|0);
  $164 = +HEAPF64[$163>>3];
  $165 = $162 - $164;
  $166 = ((($ws)) + 72|0);
  HEAPF64[$166>>3] = $165;
  $167 = ((($ws)) + 72|0);
  $168 = +HEAPF64[$167>>3];
  HEAPF64[(272)>>3] = $168;
 }
 _ShowLineNonZero(25);
 _ShowLineNonZero(26);
 _ShowLineNonZero(27);
 _ShowLineNonZero(28);
 _ShowLineNonZero(29);
 _ShowLineNonZero(30);
 _ShowLineNonZero(31);
 _ShowLineNonZero(32);
 _ShowLineNonZero(33);
 _ShowLineNonZero(34);
 _ShowLineNonZero(35);
 $j = 23;
 while(1) {
  $169 = $j;
  $170 = ($169|0)<=(35);
  if (!($170)) {
   break;
  }
  $171 = +HEAPF64[(296)>>3];
  $172 = $j;
  $173 = (8 + ($172<<3)|0);
  $174 = +HEAPF64[$173>>3];
  $175 = $171 + $174;
  HEAPF64[(296)>>3] = $175;
  $176 = $j;
  $177 = (($176) + 1)|0;
  $j = $177;
 }
 _showline(36);
 $178 = +HEAPF64[(184)>>3];
 $179 = +HEAPF64[(296)>>3];
 $180 = $178 - $179;
 HEAPF64[(304)>>3] = $180;
 _showline_wmsg(37,62248);
 $181 = +HEAPF64[(304)>>3];
 HEAPF64[(312)>>3] = $181;
 _showline(38);
 _GetLine(62270,(320));
 $182 = HEAP32[56672>>2]|0;
 $183 = +HEAPF64[(320)>>3];
 $184 = (~~(($183)));
 HEAP32[$vararg_buffer60>>2] = $184;
 (_fprintf($182,62274,$vararg_buffer60)|0);
 _GetLine(62285,8048);
 $185 = +HEAPF64[8048>>3];
 $186 = $185 != 0.0;
 if ($186) {
  $187 = HEAP32[56672>>2]|0;
  $188 = +HEAPF64[8048>>3];
  HEAPF64[$vararg_buffer63>>3] = $188;
  (_fprintf($187,62298,$vararg_buffer63)|0);
 }
 _GetLine(62326,(8648));
 _showschedA(1);
 $189 = +HEAPF64[(312)>>3];
 HEAPF64[(8656)>>3] = $189;
 _showschedA(2);
 $190 = HEAP32[56704>>2]|0;
 $191 = ($190|0)!=(0);
 $192 = +HEAPF64[(8656)>>3];
 if ($191) {
  $193 = 0.074999999999999997 * $192;
  HEAPF64[(8664)>>3] = $193;
 } else {
  $194 = 0.10000000000000001 * $192;
  HEAPF64[(8664)>>3] = $194;
 }
 _showschedA(3);
 $195 = +HEAPF64[(8648)>>3];
 $196 = +HEAPF64[(8664)>>3];
 $197 = $195 - $196;
 $198 = (+_NotLessThanZero($197));
 HEAPF64[(8672)>>3] = $198;
 _showschedA(4);
 _GetLine(62329,(8680));
 _showschedA(5);
 _GetLine(62332,(8688));
 _showschedA(6);
 _GetLine(62335,(8696));
 _showschedA(7);
 _GetLine(62338,(8704));
 _showschedA(8);
 $199 = +HEAPF64[(8680)>>3];
 $200 = +HEAPF64[(8688)>>3];
 $201 = $199 + $200;
 $202 = +HEAPF64[(8696)>>3];
 $203 = $201 + $202;
 $204 = +HEAPF64[(8704)>>3];
 $205 = $203 + $204;
 HEAPF64[(8712)>>3] = $205;
 _showschedA(9);
 _GetLine(62341,(8720));
 _showschedA(10);
 _GetLine(62345,(8728));
 _showschedA(11);
 _GetLine(62349,(8736));
 _showschedA(12);
 _GetLine(62353,(8744));
 $206 = +HEAPF64[(8744)>>3];
 $207 = $206 != 0.0;
 L101: do {
  if ($207) {
   $threshA = 109000.0;
   $threshB = 1.0E+5;
   $mult4 = 1000.0;
   $mult5 = 1.0E+4;
   $208 = HEAP32[56708>>2]|0;
   $209 = ($208|0)==(3);
   if ($209) {
    $threshA = 54500.0;
    $threshB = 5.0E+4;
    $mult4 = 500.0;
    $mult5 = 5000.0;
   }
   $210 = +HEAPF64[(312)>>3];
   $211 = $threshA;
   $212 = $210 > $211;
   if ($212) {
    HEAPF64[(8744)>>3] = 0.0;
    _print2(62357);
    break;
   }
   $213 = +HEAPF64[(312)>>3];
   $214 = $threshB;
   $215 = $213 > $214;
   if ($215) {
    $216 = +HEAPF64[(8744)>>3];
    $217 = ((($ws1)) + 8|0);
    HEAPF64[$217>>3] = $216;
    $218 = +HEAPF64[(312)>>3];
    $219 = ((($ws1)) + 16|0);
    HEAPF64[$219>>3] = $218;
    $220 = $threshB;
    $221 = ((($ws1)) + 24|0);
    HEAPF64[$221>>3] = $220;
    $222 = ((($ws1)) + 16|0);
    $223 = +HEAPF64[$222>>3];
    $224 = ((($ws1)) + 24|0);
    $225 = +HEAPF64[$224>>3];
    $226 = $223 > $225;
    if (!($226)) {
     _print2(62507);
     break;
    }
    _print2(62410);
    $227 = ((($ws1)) + 16|0);
    $228 = +HEAPF64[$227>>3];
    $229 = ((($ws1)) + 24|0);
    $230 = +HEAPF64[$229>>3];
    $231 = $228 - $230;
    $232 = $mult4;
    $233 = $231 / $232;
    $234 = $233 + 0.99990000000000001;
    $235 = (~~(($234)));
    $236 = (+($235|0));
    $237 = $mult4;
    $238 = $236 * $237;
    $239 = ((($ws1)) + 32|0);
    HEAPF64[$239>>3] = $238;
    $240 = ((($ws1)) + 32|0);
    $241 = +HEAPF64[$240>>3];
    $242 = $mult5;
    $243 = $241 / $242;
    $244 = (+_smallerof($243,1.0));
    $245 = ((($ws1)) + 40|0);
    HEAPF64[$245>>3] = $244;
    $246 = ((($ws1)) + 8|0);
    $247 = +HEAPF64[$246>>3];
    $248 = ((($ws1)) + 40|0);
    $249 = +HEAPF64[$248>>3];
    $250 = $247 * $249;
    $251 = ((($ws1)) + 48|0);
    HEAPF64[$251>>3] = $250;
    $252 = ((($ws1)) + 8|0);
    $253 = +HEAPF64[$252>>3];
    $254 = ((($ws1)) + 56|0);
    $255 = +HEAPF64[$254>>3];
    $256 = $253 - $255;
    $257 = ((($ws1)) + 56|0);
    HEAPF64[$257>>3] = $256;
    $258 = ((($ws1)) + 56|0);
    $259 = +HEAPF64[$258>>3];
    HEAPF64[(8744)>>3] = $259;
    $j = 0;
    while(1) {
     $260 = $j;
     $261 = ($260|0)<=(7);
     if (!($261)) {
      break L101;
     }
     $262 = HEAP32[56672>>2]|0;
     $263 = $j;
     $264 = $j;
     $265 = (($ws1) + ($264<<3)|0);
     $266 = +HEAPF64[$265>>3];
     HEAP32[$vararg_buffer66>>2] = $263;
     $vararg_ptr69 = ((($vararg_buffer66)) + 8|0);
     HEAPF64[$vararg_ptr69>>3] = $266;
     (_fprintf($262,62483,$vararg_buffer66)|0);
     $267 = $j;
     $268 = (($267) + 1)|0;
     $j = $268;
    }
   }
  }
 } while(0);
 _showschedA(13);
 _GetLine(62575,(8752));
 _showschedA(14);
 $269 = +HEAPF64[(8720)>>3];
 $270 = +HEAPF64[(8728)>>3];
 $271 = $269 + $270;
 $272 = +HEAPF64[(8736)>>3];
 $273 = $271 + $272;
 $274 = +HEAPF64[(8744)>>3];
 $275 = $273 + $274;
 $276 = +HEAPF64[(8752)>>3];
 $277 = $275 + $276;
 HEAPF64[(8760)>>3] = $277;
 _showschedA(15);
 _GetLine(62579,(8768));
 _showschedA(16);
 _GetLine(62583,(8776));
 _showschedA(17);
 _GetLine(62587,(8784));
 _showschedA_wMsg(18,62591);
 $278 = +HEAPF64[(8768)>>3];
 $279 = +HEAPF64[(8776)>>3];
 $280 = $278 + $279;
 $281 = +HEAPF64[(8784)>>3];
 $282 = $280 + $281;
 HEAPF64[(8792)>>3] = $282;
 _showschedA(19);
 _GetLine(62617,(8800));
 _showschedA(20);
 _GetLine(62621,(8808));
 _showschedA(21);
 _GetLine(62625,(8816));
 _showschedA(22);
 _GetLine(62629,(8824));
 _showschedA(23);
 $283 = +HEAPF64[(8808)>>3];
 $284 = +HEAPF64[(8816)>>3];
 $285 = $283 + $284;
 $286 = +HEAPF64[(8824)>>3];
 $287 = $285 + $286;
 HEAPF64[(8832)>>3] = $287;
 _showschedA(24);
 $288 = +HEAPF64[(312)>>3];
 HEAPF64[(8840)>>3] = $288;
 _showschedA(25);
 $289 = +HEAPF64[(8840)>>3];
 $290 = 0.02 * $289;
 HEAPF64[(8848)>>3] = $290;
 _showschedA(26);
 $291 = +HEAPF64[(8832)>>3];
 $292 = +HEAPF64[(8848)>>3];
 $293 = $291 - $292;
 $294 = (+_NotLessThanZero($293));
 HEAPF64[(8856)>>3] = $294;
 _showschedA(27);
 _GetLine(62633,(8864));
 _showschedA(28);
 $295 = HEAP32[56708>>2]|0;
 switch ($295|0) {
 case 1:  {
  HEAPF64[8056>>3] = 259400.0;
  break;
 }
 case 5: case 2:  {
  HEAPF64[8056>>3] = 311300.0;
  break;
 }
 case 3:  {
  HEAPF64[8056>>3] = 156650.0;
  break;
 }
 case 4:  {
  HEAPF64[8056>>3] = 285350.0;
  break;
 }
 default: {
  $296 = HEAP32[56708>>2]|0;
  HEAP32[$vararg_buffer70>>2] = $296;
  (_printf(58524,$vararg_buffer70)|0);
  _exit(1);
  // unreachable;
 }
 }
 $297 = +HEAPF64[(312)>>3];
 $298 = $297 <= 155650.0;
 L124: do {
  if ($298) {
   $299 = HEAP32[56672>>2]|0;
   (_fprintf($299,62637,$vararg_buffer73)|0);
   $300 = +HEAPF64[(8672)>>3];
   $301 = +HEAPF64[(8712)>>3];
   $302 = $300 + $301;
   $303 = +HEAPF64[(8760)>>3];
   $304 = $302 + $303;
   $305 = +HEAPF64[(8792)>>3];
   $306 = $304 + $305;
   $307 = +HEAPF64[(8800)>>3];
   $308 = $306 + $307;
   $309 = +HEAPF64[(8856)>>3];
   $310 = $308 + $309;
   $311 = +HEAPF64[(8864)>>3];
   $312 = $310 + $311;
   HEAPF64[(8872)>>3] = $312;
  } else {
   $313 = +HEAPF64[(8672)>>3];
   $314 = +HEAPF64[(8712)>>3];
   $315 = $313 + $314;
   $316 = +HEAPF64[(8760)>>3];
   $317 = $315 + $316;
   $318 = +HEAPF64[(8792)>>3];
   $319 = $317 + $318;
   $320 = +HEAPF64[(8800)>>3];
   $321 = $319 + $320;
   $322 = +HEAPF64[(8856)>>3];
   $323 = $321 + $322;
   $324 = +HEAPF64[(8864)>>3];
   $325 = $323 + $324;
   HEAPF64[(24648)>>3] = $325;
   $326 = HEAP32[56672>>2]|0;
   $327 = +HEAPF64[(24648)>>3];
   HEAPF64[$vararg_buffer75>>3] = $327;
   (_fprintf($326,62670,$vararg_buffer75)|0);
   $328 = +HEAPF64[(8672)>>3];
   $329 = +HEAPF64[(8752)>>3];
   $330 = $328 + $329;
   $331 = +HEAPF64[(8800)>>3];
   $332 = $330 + $331;
   HEAPF64[(24656)>>3] = $332;
   $333 = +HEAPF64[(24656)>>3];
   $334 = +HEAPF64[(24648)>>3];
   $335 = $333 >= $334;
   $336 = +HEAPF64[(24648)>>3];
   do {
    if ($335) {
     HEAPF64[(8872)>>3] = $336;
    } else {
     $337 = +HEAPF64[(24656)>>3];
     $338 = $336 - $337;
     HEAPF64[(24664)>>3] = $338;
     $339 = +HEAPF64[(24664)>>3];
     $340 = 0.80000000000000004 * $339;
     HEAPF64[(24672)>>3] = $340;
     $341 = +HEAPF64[(312)>>3];
     HEAPF64[(24680)>>3] = $341;
     $342 = +HEAPF64[8056>>3];
     HEAPF64[(24688)>>3] = $342;
     $343 = +HEAPF64[(24688)>>3];
     $344 = +HEAPF64[(24680)>>3];
     $345 = $343 < $344;
     if ($345) {
      $346 = +HEAPF64[(24680)>>3];
      $347 = +HEAPF64[(24688)>>3];
      $348 = $346 - $347;
      HEAPF64[(24696)>>3] = $348;
      $349 = +HEAPF64[(24696)>>3];
      $350 = 0.029999999999999999 * $349;
      HEAPF64[(24704)>>3] = $350;
      $351 = +HEAPF64[(24672)>>3];
      $352 = +HEAPF64[(24704)>>3];
      $353 = (+_smallerof($351,$352));
      HEAPF64[(24712)>>3] = $353;
      $354 = +HEAPF64[(24648)>>3];
      $355 = +HEAPF64[(24712)>>3];
      $356 = $354 - $355;
      HEAPF64[(24720)>>3] = $356;
      $357 = +HEAPF64[(24720)>>3];
      HEAPF64[(8872)>>3] = $357;
      break;
     } else {
      $358 = +HEAPF64[(24648)>>3];
      HEAPF64[(8872)>>3] = $358;
      break;
     }
    }
   } while(0);
   $359 = HEAP32[56672>>2]|0;
   (_fprintf($359,62716,$vararg_buffer78)|0);
   $j = 1;
   while(1) {
    $360 = $j;
    $361 = ($360|0)<=(10);
    if (!($361)) {
     break L124;
    }
    $362 = $j;
    $363 = (24640 + ($362<<3)|0);
    $364 = +HEAPF64[$363>>3];
    $365 = $364 != 0.0;
    if ($365) {
     $366 = $j;
     $367 = $j;
     $368 = (24640 + ($367<<3)|0);
     $369 = +HEAPF64[$368>>3];
     HEAP32[$vararg_buffer80>>2] = $366;
     $vararg_ptr83 = ((($vararg_buffer80)) + 8|0);
     HEAPF64[$vararg_ptr83>>3] = $369;
     (_printf(62749,$vararg_buffer80)|0);
     $370 = HEAP32[56672>>2]|0;
     $371 = $j;
     $372 = $j;
     $373 = (24640 + ($372<<3)|0);
     $374 = +HEAPF64[$373>>3];
     HEAP32[$vararg_buffer84>>2] = $371;
     $vararg_ptr87 = ((($vararg_buffer84)) + 8|0);
     HEAPF64[$vararg_ptr87>>3] = $374;
     (_fprintf($370,62749,$vararg_buffer84)|0);
    }
    $375 = $j;
    $376 = (($375) + 1)|0;
    $j = $376;
   }
  }
 } while(0);
 _showschedA(29);
 $377 = +HEAPF64[(8872)>>3];
 HEAPF64[(328)>>3] = $377;
 $378 = +HEAPF64[(328)>>3];
 $379 = $378 > 0.0;
 if ($379) {
  $itemize = 1;
 } else {
  $itemize = 0;
 }
 $380 = +HEAPF64[(320)>>3];
 $381 = $380 == 0.0;
 if ($381) {
  $S_STD_DEDUC = 6300.0;
  $MFS_STD_DEDUC = 6300.0;
  $MFJ_STD_DEDUC = 12600.0;
  $HH_STD_DEDUC = 9300.0;
 } else {
  $382 = +HEAPF64[(320)>>3];
  $383 = (~~(($382)));
  switch ($383|0) {
  case 1:  {
   $S_STD_DEDUC = 7850.0;
   $MFJ_STD_DEDUC = 13850.0;
   $MFS_STD_DEDUC = 7550.0;
   $HH_STD_DEDUC = 10850.0;
   break;
  }
  case 2:  {
   $S_STD_DEDUC = 9400.0;
   $MFJ_STD_DEDUC = 15100.0;
   $MFS_STD_DEDUC = 8800.0;
   $HH_STD_DEDUC = 12400.0;
   break;
  }
  case 3:  {
   $MFJ_STD_DEDUC = 16350.0;
   $MFS_STD_DEDUC = 10050.0;
   $S_STD_DEDUC = 9300.0;
   $HH_STD_DEDUC = 12400.0;
   break;
  }
  case 4:  {
   $MFJ_STD_DEDUC = 17600.0;
   $MFS_STD_DEDUC = 11300.0;
   $S_STD_DEDUC = 9300.0;
   $HH_STD_DEDUC = 12400.0;
   break;
  }
  default: {
   $384 = HEAP32[56672>>2]|0;
   $385 = +HEAPF64[(320)>>3];
   HEAPF64[$vararg_buffer88>>3] = $385;
   (_fprintf($384,62768,$vararg_buffer88)|0);
   $386 = +HEAPF64[(320)>>3];
   HEAPF64[$vararg_buffer91>>3] = $386;
   (_printf(62768,$vararg_buffer91)|0);
   _exit(1);
   // unreachable;
  }
  }
  $387 = HEAP32[56672>>2]|0;
  (_fprintf($387,62815,$vararg_buffer94)|0);
 }
 $388 = HEAP32[56708>>2]|0;
 $389 = ($388|0)==(1);
 do {
  if ($389) {
   $390 = +HEAPF64[(328)>>3];
   $391 = $S_STD_DEDUC;
   $392 = $390 < $391;
   if ($392) {
    $393 = $S_STD_DEDUC;
    HEAPF64[(328)>>3] = $393;
    $394 = HEAP32[56672>>2]|0;
    (_fprintf($394,62888,$vararg_buffer96)|0);
    $itemize = 0;
   }
  } else {
   $395 = HEAP32[56708>>2]|0;
   $396 = ($395|0)==(3);
   if ($396) {
    $397 = +HEAPF64[(328)>>3];
    $398 = $MFS_STD_DEDUC;
    $399 = $397 < $398;
    if (!($399)) {
     break;
    }
    $400 = $MFS_STD_DEDUC;
    HEAPF64[(328)>>3] = $400;
    $401 = HEAP32[56672>>2]|0;
    (_fprintf($401,62888,$vararg_buffer98)|0);
    $itemize = 0;
    break;
   }
   $402 = HEAP32[56708>>2]|0;
   $403 = ($402|0)==(2);
   $404 = HEAP32[56708>>2]|0;
   $405 = ($404|0)==(5);
   $or$cond7 = $403 | $405;
   if ($or$cond7) {
    $406 = +HEAPF64[(328)>>3];
    $407 = $MFJ_STD_DEDUC;
    $408 = $406 < $407;
    if (!($408)) {
     break;
    }
    $409 = $MFJ_STD_DEDUC;
    HEAPF64[(328)>>3] = $409;
    $410 = HEAP32[56672>>2]|0;
    (_fprintf($410,62888,$vararg_buffer100)|0);
    $itemize = 0;
    break;
   }
   $411 = HEAP32[56708>>2]|0;
   $412 = ($411|0)==(4);
   if (!($412)) {
    (_printf(62913,$vararg_buffer104)|0);
    $418 = HEAP32[56672>>2]|0;
    (_fprintf($418,62913,$vararg_buffer106)|0);
    _exit(1);
    // unreachable;
   }
   $413 = +HEAPF64[(328)>>3];
   $414 = $HH_STD_DEDUC;
   $415 = $413 < $414;
   if ($415) {
    $416 = $HH_STD_DEDUC;
    HEAPF64[(328)>>3] = $416;
    $417 = HEAP32[56672>>2]|0;
    (_fprintf($417,62888,$vararg_buffer102)|0);
    $itemize = 0;
   }
  }
 } while(0);
 $419 = $itemize;
 $420 = ($419|0)!=(0);
 if ($420) {
  $421 = HEAP32[56672>>2]|0;
  (_fprintf($421,62942,$vararg_buffer108)|0);
 }
 _showline(40);
 $422 = +HEAPF64[(312)>>3];
 $423 = +HEAPF64[(328)>>3];
 $424 = $422 - $423;
 HEAPF64[(336)>>3] = $424;
 _showline(41);
 $425 = +HEAPF64[(312)>>3];
 $426 = +HEAPF64[8056>>3];
 $427 = $425 <= $426;
 $428 = +HEAPF64[(56)>>3];
 $429 = 4050.0 * $428;
 do {
  if ($427) {
   HEAPF64[(344)>>3] = $429;
  } else {
   $430 = ((($dedexws)) + 16|0);
   HEAPF64[$430>>3] = $429;
   $431 = +HEAPF64[(312)>>3];
   $432 = ((($dedexws)) + 24|0);
   HEAPF64[$432>>3] = $431;
   $433 = +HEAPF64[8056>>3];
   $434 = ((($dedexws)) + 32|0);
   HEAPF64[$434>>3] = $433;
   $435 = ((($dedexws)) + 24|0);
   $436 = +HEAPF64[$435>>3];
   $437 = ((($dedexws)) + 32|0);
   $438 = +HEAPF64[$437>>3];
   $439 = $436 - $438;
   $440 = ((($dedexws)) + 40|0);
   HEAPF64[$440>>3] = $439;
   $441 = HEAP32[56708>>2]|0;
   $442 = ($441|0)==(3);
   if ($442) {
    $thresh = 61250.0;
   } else {
    $thresh = 122500.0;
   }
   $443 = ((($dedexws)) + 40|0);
   $444 = +HEAPF64[$443>>3];
   $445 = $thresh;
   $446 = $444 > $445;
   if ($446) {
    HEAPF64[(344)>>3] = 0.0;
    break;
   }
   $447 = HEAP32[56708>>2]|0;
   $448 = ($447|0)!=(3);
   $449 = ((($dedexws)) + 40|0);
   $450 = +HEAPF64[$449>>3];
   if ($448) {
    $451 = $450 / 2500.0;
    $452 = $451 + 0.99999899999999997;
    $453 = (~~(($452)));
    $j2 = $453;
   } else {
    $454 = $450 / 1250.0;
    $455 = $454 + 0.99999899999999997;
    $456 = (~~(($455)));
    $j2 = $456;
   }
   $457 = $j2;
   $458 = (+($457|0));
   $459 = ((($dedexws)) + 48|0);
   HEAPF64[$459>>3] = $458;
   $460 = ((($dedexws)) + 48|0);
   $461 = +HEAPF64[$460>>3];
   $462 = 0.02 * $461;
   $463 = ((($dedexws)) + 56|0);
   HEAPF64[$463>>3] = $462;
   $464 = ((($dedexws)) + 16|0);
   $465 = +HEAPF64[$464>>3];
   $466 = ((($dedexws)) + 56|0);
   $467 = +HEAPF64[$466>>3];
   $468 = $465 * $467;
   $469 = ((($dedexws)) + 64|0);
   HEAPF64[$469>>3] = $468;
   $470 = ((($dedexws)) + 16|0);
   $471 = +HEAPF64[$470>>3];
   $472 = ((($dedexws)) + 64|0);
   $473 = +HEAPF64[$472>>3];
   $474 = $471 - $473;
   $475 = ((($dedexws)) + 72|0);
   HEAPF64[$475>>3] = $474;
   $476 = ((($dedexws)) + 72|0);
   $477 = +HEAPF64[$476>>3];
   HEAPF64[(344)>>3] = $477;
  }
 } while(0);
 _showline(42);
 $478 = +HEAPF64[(336)>>3];
 $479 = +HEAPF64[(344)>>3];
 $480 = $478 - $479;
 $481 = (+_NotLessThanZero($480));
 HEAPF64[(352)>>3] = $481;
 _showline_wmsg(43,62954);
 $482 = +HEAPF64[(352)>>3];
 $483 = HEAP32[56708>>2]|0;
 $484 = (+_TaxRateFunction($482,$483));
 HEAPF64[(360)>>3] = $484;
 $485 = +HEAPF64[(352)>>3];
 $486 = $485 <= 0.0;
 do {
  if ($486) {
   (_printf(62969,$vararg_buffer110)|0);
  } else {
   $487 = HEAP32[56696>>2]|0;
   $488 = ($487|0)!=(0);
   $489 = HEAP32[56692>>2]|0;
   $490 = ($489|0)!=(0);
   $or$cond9 = $488 | $490;
   do {
    if (!($or$cond9)) {
     $491 = +HEAPF64[8016>>3];
     $492 = $491 > 0.0;
     $493 = +HEAPF64[(112)>>3];
     $494 = $493 > 0.0;
     $or$cond11 = $492 | $494;
     if (!($or$cond11)) {
      $495 = +HEAPF64[(16760)>>3];
      $496 = $495 > 0.0;
      $497 = +HEAPF64[(16768)>>3];
      $498 = $497 > 0.0;
      $or$cond13 = $496 & $498;
      if (!($or$cond13)) {
       break;
      }
     }
     HEAP32[56692>>2] = 1;
    }
   } while(0);
   $499 = HEAP32[56692>>2]|0;
   $500 = ($499|0)!=(0);
   if ($500) {
    $501 = HEAP32[56672>>2]|0;
    (_fprintf($501,63058,$vararg_buffer112)|0);
    $502 = HEAP32[56708>>2]|0;
    $503 = +HEAPF64[8016>>3];
    _capgains_qualdividends_worksheets($502,$503);
    break;
   }
   $504 = HEAP32[56696>>2]|0;
   $505 = ($504|0)!=(0);
   if (!($505)) {
    break;
   }
   $506 = HEAP32[56672>>2]|0;
   (_fprintf($506,63128,$vararg_buffer114)|0);
   $507 = HEAP32[56708>>2]|0;
   $508 = +HEAPF64[8016>>3];
   _sched_D_tax_worksheet($507,$508);
  }
 } while(0);
 _showline_wmsg(44,63172);
 _GetLine(63176,(376));
 _GetLine(63180,(392));
 $509 = $itemize;
 $510 = (+_form6251_AlternativeMinimumTax($509));
 HEAPF64[(368)>>3] = $510;
 $511 = +HEAPF64[(368)>>3];
 $512 = $511 == 0.0;
 $513 = HEAP32[56672>>2]|0;
 if ($512) {
  (_fprintf($513,63184,$vararg_buffer116)|0);
 } else {
  (_fprintf($513,63228,$vararg_buffer118)|0);
 }
 _ShowLineNonZero_wMsg(45,63270);
 $514 = +HEAPF64[(352)>>3];
 $515 = +HEAPF64[(368)>>3];
 $516 = HEAP32[56708>>2]|0;
 _Report_bracket_info($514,$515,$516);
 _showline(46);
 $517 = +HEAPF64[(360)>>3];
 $518 = +HEAPF64[(368)>>3];
 $519 = $517 + $518;
 $520 = +HEAPF64[(376)>>3];
 $521 = $519 + $520;
 HEAPF64[(384)>>3] = $521;
 _showline(47);
 _ShowLineNonZero(48);
 _GetLine(63294,(400));
 _ShowLineNonZero(49);
 _GetLine(63298,(408));
 _ShowLineNonZero(50);
 _GetLine(63302,(416));
 _ShowLineNonZero(51);
 _GetLine(63306,(424));
 _ShowLineNonZero(52);
 _GetLine(63310,(432));
 _ShowLineNonZero(53);
 _GetLine(63314,(440));
 _ShowLineNonZero(54);
 $j = 48;
 while(1) {
  $522 = $j;
  $523 = ($522|0)<=(54);
  if (!($523)) {
   break;
  }
  $524 = +HEAPF64[(448)>>3];
  $525 = $j;
  $526 = (8 + ($525<<3)|0);
  $527 = +HEAPF64[$526>>3];
  $528 = $524 + $527;
  HEAPF64[(448)>>3] = $528;
  $529 = $j;
  $530 = (($529) + 1)|0;
  $j = $530;
 }
 _showline(55);
 $531 = +HEAPF64[(384)>>3];
 $532 = +HEAPF64[(448)>>3];
 $533 = $531 - $532;
 $534 = (+_NotLessThanZero($533));
 HEAPF64[(456)>>3] = $534;
 _showline(56);
 _GetLine(63318,(464));
 _ShowLineNonZero(57);
 _GetLine(63322,(472));
 _ShowLineNonZero(58);
 _GetLine(63326,(480));
 _ShowLineNonZero(59);
 _GetLine(63330,(488));
 $535 = +HEAPF64[(488)>>3];
 $536 = $535 != 0.0;
 if ($536) {
  $537 = HEAP32[56672>>2]|0;
  $538 = +HEAPF64[(488)>>3];
  HEAPF64[$vararg_buffer120>>3] = $538;
  (_fprintf($537,63335,$vararg_buffer120)|0);
 }
 _GetLine(63349,8040);
 $539 = +HEAPF64[8040>>3];
 $540 = $539 != 0.0;
 if ($540) {
  $541 = HEAP32[56672>>2]|0;
  $542 = +HEAPF64[8040>>3];
  HEAPF64[$vararg_buffer123>>3] = $542;
  (_fprintf($541,63354,$vararg_buffer123)|0);
 }
 $543 = +HEAPF64[(488)>>3];
 $544 = +HEAPF64[8040>>3];
 $545 = $543 + $544;
 HEAPF64[(488)>>3] = $545;
 _GetLine(63368,(496));
 _ShowLineNonZero(61);
 _GetLine(63372,(504));
 _ShowLineNonZero(62);
 $j = 56;
 while(1) {
  $546 = $j;
  $547 = ($546|0)<=(62);
  if (!($547)) {
   break;
  }
  $548 = +HEAPF64[(512)>>3];
  $549 = $j;
  $550 = (8 + ($549<<3)|0);
  $551 = +HEAPF64[$550>>3];
  $552 = $548 + $551;
  HEAPF64[(512)>>3] = $552;
  $553 = $j;
  $554 = (($553) + 1)|0;
  $j = $554;
 }
 _showline_wmsg(63,63376);
 _GetLineF(63386,(520));
 _GetLine(63390,(528));
 _ShowLineNonZero(65);
 _GetLine(63394,(536));
 _ShowLineNonZero(66);
 _GetLine(63399,(544));
 _ShowLineNonZero(67);
 _GetLine(63403,(552));
 _ShowLineNonZero(68);
 _GetLine(63407,(560));
 _ShowLineNonZero(69);
 _GetLine(63411,(568));
 _ShowLineNonZero(70);
 _GetLine(63415,(576));
 _ShowLineNonZero(71);
 _GetLine(63419,(584));
 _ShowLineNonZero(72);
 _GetLine(63423,(592));
 _ShowLineNonZero(73);
 $j = 64;
 while(1) {
  $555 = $j;
  $556 = ($555|0)<=(73);
  if (!($556)) {
   break;
  }
  $557 = +HEAPF64[(600)>>3];
  $558 = $j;
  $559 = (8 + ($558<<3)|0);
  $560 = +HEAPF64[$559>>3];
  $561 = $557 + $560;
  HEAPF64[(600)>>3] = $561;
  $562 = $j;
  $563 = (($562) + 1)|0;
  $j = $563;
 }
 _showline_wmsg(74,63427);
 $564 = +HEAPF64[(600)>>3];
 $565 = +HEAPF64[(512)>>3];
 $566 = $564 > $565;
 if ($566) {
  $567 = +HEAPF64[(600)>>3];
  $568 = +HEAPF64[(512)>>3];
  $569 = $567 - $568;
  HEAPF64[(608)>>3] = $569;
  $570 = HEAP32[56672>>2]|0;
  $571 = +HEAPF64[(608)>>3];
  HEAPF64[$vararg_buffer126>>3] = $571;
  (_fprintf($570,63442,$vararg_buffer126)|0);
  $572 = HEAP32[56672>>2]|0;
  $573 = +HEAPF64[(608)>>3];
  HEAPF64[$vararg_buffer129>>3] = $573;
  (_fprintf($572,63466,$vararg_buffer129)|0);
 } else {
  $574 = +HEAPF64[(512)>>3];
  $575 = +HEAPF64[(600)>>3];
  $576 = $574 - $575;
  HEAPF64[(632)>>3] = $576;
  $577 = HEAP32[56672>>2]|0;
  $578 = +HEAPF64[(632)>>3];
  HEAPF64[$vararg_buffer132>>3] = $578;
  (_fprintf($577,63481,$vararg_buffer132)|0);
  $579 = HEAP32[56672>>2]|0;
  $580 = +HEAPF64[(632)>>3];
  $581 = 100.0 * $580;
  $582 = +HEAPF64[(512)>>3];
  $583 = $581 / $582;
  HEAPF64[$vararg_buffer135>>3] = $583;
  (_fprintf($579,63503,$vararg_buffer135)|0);
 }
 $584 = HEAP32[56672>>2]|0;
 (_fprintf($584,63559,$vararg_buffer138)|0);
 $585 = (_GetTextLineF(63575)|0);
 $Your1stName = $585;
 $586 = (_GetTextLineF(63588)|0);
 $YourLastName = $586;
 (_GetTextLineF(63602)|0);
 $587 = (_GetTextLineF(63615)|0);
 $Spouse1stName = $587;
 $588 = (_GetTextLineF(63630)|0);
 $SpouseLastName = $588;
 (_GetTextLineF(63646)|0);
 $589 = $YourLastName;
 $590 = (_strlen($589)|0);
 $591 = ($590>>>0)>(0);
 if (!($591)) {
  (_GetTextLineF(63729)|0);
  (_GetTextLineF(63744)|0);
  (_GetTextLineF(63750)|0);
  STACKTOP = sp;return 0;
 }
 $592 = $YourLastName;
 $593 = $SpouseLastName;
 $594 = (_strcmp($592,$593)|0);
 $595 = ($594|0)==(0);
 if ($595) {
  $596 = HEAP32[56672>>2]|0;
  $597 = $Your1stName;
  $598 = $Spouse1stName;
  $599 = $YourLastName;
  HEAP32[$vararg_buffer140>>2] = $597;
  $vararg_ptr143 = ((($vararg_buffer140)) + 4|0);
  HEAP32[$vararg_ptr143>>2] = $598;
  $vararg_ptr144 = ((($vararg_buffer140)) + 8|0);
  HEAP32[$vararg_ptr144>>2] = $599;
  (_fprintf($596,63661,$vararg_buffer140)|0);
  (_GetTextLineF(63729)|0);
  (_GetTextLineF(63744)|0);
  (_GetTextLineF(63750)|0);
  STACKTOP = sp;return 0;
 }
 $600 = $SpouseLastName;
 $601 = (_strlen($600)|0);
 $602 = ($601>>>0)>(0);
 $603 = HEAP32[56672>>2]|0;
 $604 = $Your1stName;
 $605 = $YourLastName;
 if ($602) {
  $606 = $Spouse1stName;
  $607 = $SpouseLastName;
  HEAP32[$vararg_buffer145>>2] = $604;
  $vararg_ptr148 = ((($vararg_buffer145)) + 4|0);
  HEAP32[$vararg_ptr148>>2] = $605;
  $vararg_ptr149 = ((($vararg_buffer145)) + 8|0);
  HEAP32[$vararg_ptr149>>2] = $606;
  $vararg_ptr150 = ((($vararg_buffer145)) + 12|0);
  HEAP32[$vararg_ptr150>>2] = $607;
  (_fprintf($603,63685,$vararg_buffer145)|0);
  (_GetTextLineF(63729)|0);
  (_GetTextLineF(63744)|0);
  (_GetTextLineF(63750)|0);
  STACKTOP = sp;return 0;
 } else {
  HEAP32[$vararg_buffer151>>2] = $604;
  $vararg_ptr154 = ((($vararg_buffer151)) + 4|0);
  HEAP32[$vararg_ptr154>>2] = $605;
  (_fprintf($603,63711,$vararg_buffer151)|0);
  (_GetTextLineF(63729)|0);
  (_GetTextLineF(63744)|0);
  (_GetTextLineF(63750)|0);
  STACKTOP = sp;return 0;
 }
 return (0)|0;
}
function _islower($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($c) + -97)|0;
 $1 = ($0>>>0)<(26);
 $2 = $1&1;
 return ($2|0);
}
function _isspace($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($c|0)==(32);
 $1 = (($c) + -9)|0;
 $2 = ($1>>>0)<(5);
 $3 = $0 | $2;
 $4 = $3&1;
 return ($4|0);
}
function _isupper($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($c) + -65)|0;
 $1 = ($0>>>0)<(26);
 $2 = $1&1;
 return ($2|0);
}
function _tolower($c) {
 $c = $c|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_isupper($c)|0);
 $1 = ($0|0)==(0);
 $2 = $c | 32;
 $$0 = $1 ? $c : $2;
 return ($$0|0);
}
function _toupper($c) {
 $c = $c|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_islower($c)|0);
 $1 = ($0|0)==(0);
 $2 = $c & 95;
 $$0 = $1 ? $c : $2;
 return ($$0|0);
}
function _strerror($e) {
 $e = $e|0;
 var $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$03 = 0, $i$03$lcssa = 0, $i$12 = 0, $s$0$lcssa = 0, $s$01 = 0, $s$1 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $i$03 = 0;
 while(1) {
  $1 = (63764 + ($i$03)|0);
  $2 = HEAP8[$1>>0]|0;
  $3 = $2&255;
  $4 = ($3|0)==($e|0);
  if ($4) {
   $i$03$lcssa = $i$03;
   label = 2;
   break;
  }
  $5 = (($i$03) + 1)|0;
  $6 = ($5|0)==(87);
  if ($6) {
   $i$12 = 87;$s$01 = 63852;
   label = 5;
   break;
  } else {
   $i$03 = $5;
  }
 }
 if ((label|0) == 2) {
  $0 = ($i$03$lcssa|0)==(0);
  if ($0) {
   $s$0$lcssa = 63852;
  } else {
   $i$12 = $i$03$lcssa;$s$01 = 63852;
   label = 5;
  }
 }
 if ((label|0) == 5) {
  while(1) {
   label = 0;
   $s$1 = $s$01;
   while(1) {
    $7 = HEAP8[$s$1>>0]|0;
    $8 = ($7<<24>>24)==(0);
    $9 = ((($s$1)) + 1|0);
    if ($8) {
     $$lcssa = $9;
     break;
    } else {
     $s$1 = $9;
    }
   }
   $10 = (($i$12) + -1)|0;
   $11 = ($10|0)==(0);
   if ($11) {
    $s$0$lcssa = $$lcssa;
    break;
   } else {
    $i$12 = $10;$s$01 = $$lcssa;
    label = 5;
   }
  }
 }
 return ($s$0$lcssa|0);
}
function ___errno_location() {
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[56720>>2]|0;
 $1 = ($0|0)==(0|0);
 if ($1) {
  $$0 = 56976;
 } else {
  $2 = (_pthread_self()|0);
  $3 = ((($2)) + 60|0);
  $4 = HEAP32[$3>>2]|0;
  $$0 = $4;
 }
 return ($$0|0);
}
function ___floatscan($f,$prec,$pok) {
 $f = $f|0;
 $prec = $prec|0;
 $pok = $pok|0;
 var $$$i = 0, $$0 = 0.0, $$0$i27 = 0.0, $$010$i = 0, $$07$i = 0, $$0710$i = 0, $$0711$i = 0, $$09$i = 0, $$1$be$i = 0, $$1$ph$i = 0, $$11$i = 0, $$18$i = 0, $$2$i = 0, $$3$be$i = 0, $$3$lcssa$i = 0, $$3105$i = 0, $$in = 0, $$k$0$i = 0, $$lcssa = 0, $$lcssa256 = 0;
 var $$lcssa256$lcssa = 0, $$lcssa257 = 0, $$lcssa257$lcssa = 0, $$lcssa263 = 0, $$lcssa264 = 0, $$lcssa265 = 0, $$lcssa275 = 0, $$lnz$0$i = 0, $$neg32$i = 0, $$not$i = 0, $$old8 = 0, $$pn$i = 0.0, $$pre$i = 0, $$pre$i17 = 0, $$pre$phi42$iZ2D = 0.0, $$pre41$i = 0.0, $$promoted$i = 0, $$sink$off0$i = 0, $0 = 0, $1 = 0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0;
 var $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0;
 var $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0.0, $183 = 0.0, $184 = 0.0, $185 = 0.0, $186 = 0, $187 = 0, $188 = 0.0, $189 = 0.0, $19 = 0;
 var $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0;
 var $208 = 0, $209 = 0.0, $21 = 0, $210 = 0.0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0;
 var $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0;
 var $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0.0, $259 = 0.0, $26 = 0, $260 = 0, $261 = 0;
 var $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0.0, $268 = 0.0, $269 = 0.0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0;
 var $280 = 0.0, $281 = 0.0, $282 = 0.0, $283 = 0, $284 = 0, $285 = 0.0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0;
 var $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0.0, $31 = 0, $310 = 0.0, $311 = 0.0, $312 = 0, $313 = 0, $314 = 0, $315 = 0;
 var $316 = 0, $317 = 0.0, $318 = 0.0, $319 = 0.0, $32 = 0, $320 = 0.0, $321 = 0.0, $322 = 0.0, $323 = 0, $324 = 0, $325 = 0.0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0;
 var $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0;
 var $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0;
 var $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0;
 var $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0;
 var $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0;
 var $424 = 0.0, $425 = 0.0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0.0;
 var $442 = 0.0, $443 = 0.0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0.0, $454 = 0.0, $455 = 0.0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0;
 var $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0.0, $466 = 0.0, $467 = 0.0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0;
 var $479 = 0.0, $48 = 0, $480 = 0, $481 = 0.0, $482 = 0.0, $483 = 0, $484 = 0.0, $485 = 0, $486 = 0.0, $487 = 0.0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0.0, $492 = 0.0, $493 = 0, $494 = 0, $495 = 0, $496 = 0;
 var $497 = 0, $498 = 0.0, $499 = 0.0, $5 = 0, $50 = 0.0, $500 = 0.0, $501 = 0, $502 = 0, $503 = 0, $504 = 0.0, $505 = 0.0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0.0, $510 = 0, $511 = 0, $512 = 0, $513 = 0;
 var $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0.0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0;
 var $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0;
 var $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0;
 var $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0;
 var $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0;
 var $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0.0, $62 = 0, $620 = 0, $621 = 0;
 var $622 = 0, $623 = 0, $624 = 0.0, $625 = 0.0, $626 = 0.0, $627 = 0, $628 = 0.0, $629 = 0.0, $63 = 0, $630 = 0.0, $631 = 0.0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0;
 var $640 = 0, $641 = 0, $642 = 0.0, $643 = 0.0, $644 = 0.0, $645 = 0, $646 = 0.0, $647 = 0.0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0.0, $652 = 0.0, $653 = 0.0, $654 = 0.0, $655 = 0, $656 = 0, $657 = 0.0, $658 = 0;
 var $659 = 0.0, $66 = 0, $660 = 0.0, $661 = 0.0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0.0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0.0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0;
 var $677 = 0, $678 = 0.0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0.0, $684 = 0, $685 = 0, $686 = 0.0, $687 = 0.0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0;
 var $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0;
 var $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0;
 var $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0;
 var $98 = 0, $99 = 0, $a$0$lcssa151$i = 0, $a$085$i = 0, $a$1$i = 0, $a$1$i$lcssa = 0, $a$2$ph38$i = 0, $a$3$i = 0, $a$3$i$lcssa248 = 0, $a$3$i249 = 0, $a$3$ph$i = 0, $a$3$ph157$i = 0, $a$478$i = 0, $a$5$i = 0, $a$5$i$lcssa = 0, $a$5$i$lcssa$lcssa = 0, $bias$0$i = 0.0, $bias$0$i25 = 0.0, $bits$0$ph = 0, $brmerge$i28 = 0;
 var $c$0 = 0, $c$0$i = 0, $c$1$lcssa = 0, $c$1$ph$i = 0, $c$179 = 0, $c$2 = 0, $c$2$i = 0, $c$2$lcssa$i = 0, $c$377 = 0, $c$4 = 0, $c$5 = 0, $c$6 = 0, $carry$087$i = 0, $carry1$0$i = 0, $carry1$1$i = 0, $carry1$1$i$lcssa = 0, $carry1$1$i$lcssa$lcssa = 0, $carry3$081$i = 0, $cond$i = 0, $d$0$i = 0;
 var $denormal$0$i = 0, $denormal$1$i = 0, $denormal$2$i = 0, $e2$0$i19 = 0, $e2$0$ph$i = 0, $e2$1$i = 0, $e2$1$i246 = 0, $e2$1$ph$i = 0, $e2$1$ph156$i = 0, $e2$2$i = 0, $e2$3$i = 0, $emin$0$ph = 0, $exitcond$i = 0, $frac$0$i = 0.0, $frac$1$i = 0.0, $frac$2$i = 0.0, $gotdig$0$i = 0, $gotdig$0$i$lcssa242 = 0, $gotdig$0$i12 = 0, $gotdig$0$i12$lcssa273 = 0;
 var $gotdig$2$i = 0, $gotdig$2$i$lcssa = 0, $gotdig$2$i13 = 0, $gotdig$3$i = 0, $gotdig$3$lcssa$i = 0, $gotdig$3101$i = 0, $gotdig$3101$i$lcssa = 0, $gotdig$4$i = 0, $gotrad$0$i = 0, $gotrad$0$i$lcssa = 0, $gotrad$0$i14 = 0, $gotrad$1$i = 0, $gotrad$1$lcssa$i = 0, $gotrad$1102$i = 0, $gotrad$2$i = 0, $gottail$0$i = 0, $gottail$1$i = 0, $gottail$2$i = 0, $i$0$lcssa = 0, $i$078 = 0;
 var $i$1 = 0, $i$276 = 0, $i$3 = 0, $i$4 = 0, $i$4$lcssa = 0, $j$0$lcssa$i = 0, $j$0104$i = 0, $j$0104$i$lcssa = 0, $j$067$i = 0, $j$068$i = 0, $j$069$i = 0, $j$2$i = 0, $j$394$i = 0, $k$0$lcssa$i = 0, $k$0103$i = 0, $k$0103$i$lcssa = 0, $k$063$i = 0, $k$064$i = 0, $k$065$i = 0, $k$2$i = 0;
 var $k$3$i = 0, $k$486$i = 0, $k$5$i = 0, $k$5$in$i = 0, $k$5$z$2$i = 0, $k$679$i = 0, $lnz$0$lcssa$i = 0, $lnz$0100$i = 0, $lnz$0100$i$lcssa = 0, $lnz$057$i = 0, $lnz$058$i = 0, $lnz$059$i = 0, $lnz$2$i = 0, $or$cond = 0, $or$cond$i = 0, $or$cond$i16 = 0, $or$cond13$i = 0, $or$cond15$i = 0, $or$cond16$i = 0, $or$cond17$i = 0;
 var $or$cond182$i = 0, $or$cond19$i = 0, $or$cond20$i = 0, $or$cond3$i = 0, $or$cond4$i = 0, $or$cond5 = 0, $or$cond6$i = 0, $or$cond7 = 0, $or$cond8$i = 0, $or$cond9 = 0, $or$cond9$i = 0, $rp$0$lcssa152$i = 0, $rp$084$i = 0, $rp$1$i18 = 0, $rp$1$i18$lcssa = 0, $rp$2$ph36$i = 0, $rp$3$ph$i = 0, $rp$3$ph34$i = 0, $rp$477$i = 0, $rp$5$i = 0;
 var $rp$5$i$lcssa = 0, $rp$5$i$lcssa$lcssa = 0, $scale$0$i = 0.0, $scale$1$i = 0.0, $scale$2$i = 0.0, $sign$0 = 0, $storemerge$i = 0, $sum$i = 0, $x$0$i = 0, $x$0$i$lcssa = 0, $x$1$i = 0, $x$2$i = 0, $x$3$lcssa$i = 0, $x$324$i = 0, $x$4$lcssa$i = 0, $x$419$i = 0, $x$5$i = 0, $x$6$i = 0, $x$i = 0, $y$0$i = 0.0;
 var $y$0$i$lcssa = 0.0, $y$1$i = 0.0, $y$1$i24 = 0.0, $y$2$i = 0.0, $y$2$i26 = 0.0, $y$3$i = 0.0, $y$3$lcssa$i = 0.0, $y$320$i = 0.0, $y$4$i = 0.0, $y$5$i = 0.0, $z$0$i = 0, $z$1$i = 0, $z$1$ph37$i = 0, $z$2$i = 0, $z$3$i = 0, $z$3$i$lcssa = 0, $z$3$i$lcssa$lcssa = 0, $z$4$i = 0, $z$5$ph$i = 0, $z$7$1$i = 0;
 var $z$7$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 512|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $x$i = sp;
 switch ($prec|0) {
 case 0:  {
  $bits$0$ph = 24;$emin$0$ph = -149;
  label = 4;
  break;
 }
 case 1:  {
  $bits$0$ph = 53;$emin$0$ph = -1074;
  label = 4;
  break;
 }
 case 2:  {
  $bits$0$ph = 53;$emin$0$ph = -1074;
  label = 4;
  break;
 }
 default: {
  $$0 = 0.0;
 }
 }
 L4: do {
  if ((label|0) == 4) {
   $0 = ((($f)) + 4|0);
   $1 = ((($f)) + 100|0);
   while(1) {
    $2 = HEAP32[$0>>2]|0;
    $3 = HEAP32[$1>>2]|0;
    $4 = ($2>>>0)<($3>>>0);
    if ($4) {
     $5 = ((($2)) + 1|0);
     HEAP32[$0>>2] = $5;
     $6 = HEAP8[$2>>0]|0;
     $7 = $6&255;
     $9 = $7;
    } else {
     $8 = (___shgetc($f)|0);
     $9 = $8;
    }
    $10 = (_isspace($9)|0);
    $11 = ($10|0)==(0);
    if ($11) {
     $$lcssa275 = $9;
     break;
    }
   }
   $12 = ($$lcssa275|0)==(45);
   L13: do {
    switch ($$lcssa275|0) {
    case 43: case 45:  {
     $13 = $12&1;
     $14 = $13 << 1;
     $15 = (1 - ($14))|0;
     $16 = HEAP32[$0>>2]|0;
     $17 = HEAP32[$1>>2]|0;
     $18 = ($16>>>0)<($17>>>0);
     if ($18) {
      $19 = ((($16)) + 1|0);
      HEAP32[$0>>2] = $19;
      $20 = HEAP8[$16>>0]|0;
      $21 = $20&255;
      $c$0 = $21;$sign$0 = $15;
      break L13;
     } else {
      $22 = (___shgetc($f)|0);
      $c$0 = $22;$sign$0 = $15;
      break L13;
     }
     break;
    }
    default: {
     $c$0 = $$lcssa275;$sign$0 = 1;
    }
    }
   } while(0);
   $c$179 = $c$0;$i$078 = 0;
   while(1) {
    $23 = $c$179 | 32;
    $24 = (65656 + ($i$078)|0);
    $25 = HEAP8[$24>>0]|0;
    $26 = $25 << 24 >> 24;
    $27 = ($23|0)==($26|0);
    if (!($27)) {
     $c$1$lcssa = $c$179;$i$0$lcssa = $i$078;
     break;
    }
    $28 = ($i$078>>>0)<(7);
    do {
     if ($28) {
      $29 = HEAP32[$0>>2]|0;
      $30 = HEAP32[$1>>2]|0;
      $31 = ($29>>>0)<($30>>>0);
      if ($31) {
       $32 = ((($29)) + 1|0);
       HEAP32[$0>>2] = $32;
       $33 = HEAP8[$29>>0]|0;
       $34 = $33&255;
       $c$2 = $34;
       break;
      } else {
       $35 = (___shgetc($f)|0);
       $c$2 = $35;
       break;
      }
     } else {
      $c$2 = $c$179;
     }
    } while(0);
    $36 = (($i$078) + 1)|0;
    $37 = ($36>>>0)<(8);
    if ($37) {
     $c$179 = $c$2;$i$078 = $36;
    } else {
     $c$1$lcssa = $c$2;$i$0$lcssa = $36;
     break;
    }
   }
   L29: do {
    switch ($i$0$lcssa|0) {
    case 8:  {
     break;
    }
    case 3:  {
     label = 23;
     break;
    }
    default: {
     $38 = ($i$0$lcssa>>>0)>(3);
     $39 = ($pok|0)!=(0);
     $or$cond5 = $39 & $38;
     if ($or$cond5) {
      $40 = ($i$0$lcssa|0)==(8);
      if ($40) {
       break L29;
      } else {
       label = 23;
       break L29;
      }
     }
     $53 = ($i$0$lcssa|0)==(0);
     L34: do {
      if ($53) {
       $c$377 = $c$1$lcssa;$i$276 = 0;
       while(1) {
        $54 = $c$377 | 32;
        $55 = (67491 + ($i$276)|0);
        $56 = HEAP8[$55>>0]|0;
        $57 = $56 << 24 >> 24;
        $58 = ($54|0)==($57|0);
        if (!($58)) {
         $c$5 = $c$377;$i$3 = $i$276;
         break L34;
        }
        $59 = ($i$276>>>0)<(2);
        do {
         if ($59) {
          $60 = HEAP32[$0>>2]|0;
          $61 = HEAP32[$1>>2]|0;
          $62 = ($60>>>0)<($61>>>0);
          if ($62) {
           $63 = ((($60)) + 1|0);
           HEAP32[$0>>2] = $63;
           $64 = HEAP8[$60>>0]|0;
           $65 = $64&255;
           $c$4 = $65;
           break;
          } else {
           $66 = (___shgetc($f)|0);
           $c$4 = $66;
           break;
          }
         } else {
          $c$4 = $c$377;
         }
        } while(0);
        $67 = (($i$276) + 1)|0;
        $68 = ($67>>>0)<(3);
        if ($68) {
         $c$377 = $c$4;$i$276 = $67;
        } else {
         $c$5 = $c$4;$i$3 = $67;
         break;
        }
       }
      } else {
       $c$5 = $c$1$lcssa;$i$3 = $i$0$lcssa;
      }
     } while(0);
     switch ($i$3|0) {
     case 3:  {
      $69 = HEAP32[$0>>2]|0;
      $70 = HEAP32[$1>>2]|0;
      $71 = ($69>>>0)<($70>>>0);
      if ($71) {
       $72 = ((($69)) + 1|0);
       HEAP32[$0>>2] = $72;
       $73 = HEAP8[$69>>0]|0;
       $74 = $73&255;
       $76 = $74;
      } else {
       $75 = (___shgetc($f)|0);
       $76 = $75;
      }
      $77 = ($76|0)==(40);
      if ($77) {
       $i$4 = 1;
      } else {
       $78 = HEAP32[$1>>2]|0;
       $79 = ($78|0)==(0|0);
       if ($79) {
        $$0 = nan;
        break L4;
       }
       $80 = HEAP32[$0>>2]|0;
       $81 = ((($80)) + -1|0);
       HEAP32[$0>>2] = $81;
       $$0 = nan;
       break L4;
      }
      while(1) {
       $82 = HEAP32[$0>>2]|0;
       $83 = HEAP32[$1>>2]|0;
       $84 = ($82>>>0)<($83>>>0);
       if ($84) {
        $85 = ((($82)) + 1|0);
        HEAP32[$0>>2] = $85;
        $86 = HEAP8[$82>>0]|0;
        $87 = $86&255;
        $90 = $87;
       } else {
        $88 = (___shgetc($f)|0);
        $90 = $88;
       }
       $89 = (($90) + -48)|0;
       $91 = ($89>>>0)<(10);
       $92 = (($90) + -65)|0;
       $93 = ($92>>>0)<(26);
       $or$cond = $91 | $93;
       if (!($or$cond)) {
        $94 = (($90) + -97)|0;
        $95 = ($94>>>0)<(26);
        $96 = ($90|0)==(95);
        $or$cond7 = $96 | $95;
        if (!($or$cond7)) {
         $$lcssa = $90;$i$4$lcssa = $i$4;
         break;
        }
       }
       $108 = (($i$4) + 1)|0;
       $i$4 = $108;
      }
      $97 = ($$lcssa|0)==(41);
      if ($97) {
       $$0 = nan;
       break L4;
      }
      $98 = HEAP32[$1>>2]|0;
      $99 = ($98|0)==(0|0);
      if (!($99)) {
       $100 = HEAP32[$0>>2]|0;
       $101 = ((($100)) + -1|0);
       HEAP32[$0>>2] = $101;
      }
      if (!($39)) {
       $103 = (___errno_location()|0);
       HEAP32[$103>>2] = 22;
       ___shlim($f,0);
       $$0 = 0.0;
       break L4;
      }
      $102 = ($i$4$lcssa|0)==(0);
      if ($102) {
       $$0 = nan;
       break L4;
      } else {
       $$in = $i$4$lcssa;
      }
      while(1) {
       $104 = (($$in) + -1)|0;
       if (!($99)) {
        $105 = HEAP32[$0>>2]|0;
        $106 = ((($105)) + -1|0);
        HEAP32[$0>>2] = $106;
       }
       $107 = ($104|0)==(0);
       if ($107) {
        $$0 = nan;
        break L4;
       } else {
        $$in = $104;
       }
      }
      break;
     }
     case 0:  {
      $114 = ($c$5|0)==(48);
      do {
       if ($114) {
        $115 = HEAP32[$0>>2]|0;
        $116 = HEAP32[$1>>2]|0;
        $117 = ($115>>>0)<($116>>>0);
        if ($117) {
         $118 = ((($115)) + 1|0);
         HEAP32[$0>>2] = $118;
         $119 = HEAP8[$115>>0]|0;
         $120 = $119&255;
         $123 = $120;
        } else {
         $121 = (___shgetc($f)|0);
         $123 = $121;
        }
        $122 = $123 | 32;
        $124 = ($122|0)==(120);
        if (!($124)) {
         $326 = HEAP32[$1>>2]|0;
         $327 = ($326|0)==(0|0);
         if ($327) {
          $c$6 = 48;
          break;
         }
         $328 = HEAP32[$0>>2]|0;
         $329 = ((($328)) + -1|0);
         HEAP32[$0>>2] = $329;
         $c$6 = 48;
         break;
        }
        $125 = HEAP32[$0>>2]|0;
        $126 = HEAP32[$1>>2]|0;
        $127 = ($125>>>0)<($126>>>0);
        if ($127) {
         $128 = ((($125)) + 1|0);
         HEAP32[$0>>2] = $128;
         $129 = HEAP8[$125>>0]|0;
         $130 = $129&255;
         $c$0$i = $130;$gotdig$0$i = 0;
        } else {
         $131 = (___shgetc($f)|0);
         $c$0$i = $131;$gotdig$0$i = 0;
        }
        L94: while(1) {
         switch ($c$0$i|0) {
         case 46:  {
          $gotdig$0$i$lcssa242 = $gotdig$0$i;
          label = 74;
          break L94;
          break;
         }
         case 48:  {
          break;
         }
         default: {
          $168 = 0;$170 = 0;$694 = 0;$695 = 0;$c$2$i = $c$0$i;$gotdig$2$i = $gotdig$0$i;$gotrad$0$i = 0;$gottail$0$i = 0;$scale$0$i = 1.0;$x$0$i = 0;$y$0$i = 0.0;
          break L94;
         }
         }
         $132 = HEAP32[$0>>2]|0;
         $133 = HEAP32[$1>>2]|0;
         $134 = ($132>>>0)<($133>>>0);
         if ($134) {
          $135 = ((($132)) + 1|0);
          HEAP32[$0>>2] = $135;
          $136 = HEAP8[$132>>0]|0;
          $137 = $136&255;
          $c$0$i = $137;$gotdig$0$i = 1;
          continue;
         } else {
          $138 = (___shgetc($f)|0);
          $c$0$i = $138;$gotdig$0$i = 1;
          continue;
         }
        }
        if ((label|0) == 74) {
         $139 = HEAP32[$0>>2]|0;
         $140 = HEAP32[$1>>2]|0;
         $141 = ($139>>>0)<($140>>>0);
         if ($141) {
          $142 = ((($139)) + 1|0);
          HEAP32[$0>>2] = $142;
          $143 = HEAP8[$139>>0]|0;
          $144 = $143&255;
          $c$1$ph$i = $144;
         } else {
          $145 = (___shgetc($f)|0);
          $c$1$ph$i = $145;
         }
         $146 = ($c$1$ph$i|0)==(48);
         if ($146) {
          $154 = 0;$155 = 0;
          while(1) {
           $147 = HEAP32[$0>>2]|0;
           $148 = HEAP32[$1>>2]|0;
           $149 = ($147>>>0)<($148>>>0);
           if ($149) {
            $150 = ((($147)) + 1|0);
            HEAP32[$0>>2] = $150;
            $151 = HEAP8[$147>>0]|0;
            $152 = $151&255;
            $158 = $152;
           } else {
            $153 = (___shgetc($f)|0);
            $158 = $153;
           }
           $156 = (_i64Add(($154|0),($155|0),-1,-1)|0);
           $157 = tempRet0;
           $159 = ($158|0)==(48);
           if ($159) {
            $154 = $156;$155 = $157;
           } else {
            $168 = 0;$170 = 0;$694 = $156;$695 = $157;$c$2$i = $158;$gotdig$2$i = 1;$gotrad$0$i = 1;$gottail$0$i = 0;$scale$0$i = 1.0;$x$0$i = 0;$y$0$i = 0.0;
            break;
           }
          }
         } else {
          $168 = 0;$170 = 0;$694 = 0;$695 = 0;$c$2$i = $c$1$ph$i;$gotdig$2$i = $gotdig$0$i$lcssa242;$gotrad$0$i = 1;$gottail$0$i = 0;$scale$0$i = 1.0;$x$0$i = 0;$y$0$i = 0.0;
         }
        }
        while(1) {
         $160 = (($c$2$i) + -48)|0;
         $161 = ($160>>>0)<(10);
         $$pre$i = $c$2$i | 32;
         if ($161) {
          label = 86;
         } else {
          $162 = (($$pre$i) + -97)|0;
          $163 = ($162>>>0)<(6);
          $164 = ($c$2$i|0)==(46);
          $or$cond6$i = $164 | $163;
          if (!($or$cond6$i)) {
           $212 = $694;$213 = $170;$215 = $695;$216 = $168;$c$2$lcssa$i = $c$2$i;$gotdig$2$i$lcssa = $gotdig$2$i;$gotrad$0$i$lcssa = $gotrad$0$i;$x$0$i$lcssa = $x$0$i;$y$0$i$lcssa = $y$0$i;
           break;
          }
          if ($164) {
           $165 = ($gotrad$0$i|0)==(0);
           if ($165) {
            $696 = $170;$697 = $168;$698 = $170;$699 = $168;$gotdig$3$i = $gotdig$2$i;$gotrad$1$i = 1;$gottail$2$i = $gottail$0$i;$scale$2$i = $scale$0$i;$x$2$i = $x$0$i;$y$2$i = $y$0$i;
           } else {
            $212 = $694;$213 = $170;$215 = $695;$216 = $168;$c$2$lcssa$i = 46;$gotdig$2$i$lcssa = $gotdig$2$i;$gotrad$0$i$lcssa = $gotrad$0$i;$x$0$i$lcssa = $x$0$i;$y$0$i$lcssa = $y$0$i;
            break;
           }
          } else {
           label = 86;
          }
         }
         if ((label|0) == 86) {
          label = 0;
          $166 = ($c$2$i|0)>(57);
          $167 = (($$pre$i) + -87)|0;
          $d$0$i = $166 ? $167 : $160;
          $169 = ($168|0)<(0);
          $171 = ($170>>>0)<(8);
          $172 = ($168|0)==(0);
          $173 = $172 & $171;
          $174 = $169 | $173;
          do {
           if ($174) {
            $175 = $x$0$i << 4;
            $176 = (($d$0$i) + ($175))|0;
            $gottail$1$i = $gottail$0$i;$scale$1$i = $scale$0$i;$x$1$i = $176;$y$1$i = $y$0$i;
           } else {
            $177 = ($168|0)<(0);
            $178 = ($170>>>0)<(14);
            $179 = ($168|0)==(0);
            $180 = $179 & $178;
            $181 = $177 | $180;
            if ($181) {
             $182 = (+($d$0$i|0));
             $183 = $scale$0$i * 0.0625;
             $184 = $183 * $182;
             $185 = $y$0$i + $184;
             $gottail$1$i = $gottail$0$i;$scale$1$i = $183;$x$1$i = $x$0$i;$y$1$i = $185;
             break;
            }
            $186 = ($d$0$i|0)==(0);
            $187 = ($gottail$0$i|0)!=(0);
            $or$cond$i = $187 | $186;
            if ($or$cond$i) {
             $gottail$1$i = $gottail$0$i;$scale$1$i = $scale$0$i;$x$1$i = $x$0$i;$y$1$i = $y$0$i;
            } else {
             $188 = $scale$0$i * 0.5;
             $189 = $y$0$i + $188;
             $gottail$1$i = 1;$scale$1$i = $scale$0$i;$x$1$i = $x$0$i;$y$1$i = $189;
            }
           }
          } while(0);
          $190 = (_i64Add(($170|0),($168|0),1,0)|0);
          $191 = tempRet0;
          $696 = $694;$697 = $695;$698 = $190;$699 = $191;$gotdig$3$i = 1;$gotrad$1$i = $gotrad$0$i;$gottail$2$i = $gottail$1$i;$scale$2$i = $scale$1$i;$x$2$i = $x$1$i;$y$2$i = $y$1$i;
         }
         $192 = HEAP32[$0>>2]|0;
         $193 = HEAP32[$1>>2]|0;
         $194 = ($192>>>0)<($193>>>0);
         if ($194) {
          $195 = ((($192)) + 1|0);
          HEAP32[$0>>2] = $195;
          $196 = HEAP8[$192>>0]|0;
          $197 = $196&255;
          $168 = $699;$170 = $698;$694 = $696;$695 = $697;$c$2$i = $197;$gotdig$2$i = $gotdig$3$i;$gotrad$0$i = $gotrad$1$i;$gottail$0$i = $gottail$2$i;$scale$0$i = $scale$2$i;$x$0$i = $x$2$i;$y$0$i = $y$2$i;
          continue;
         } else {
          $198 = (___shgetc($f)|0);
          $168 = $699;$170 = $698;$694 = $696;$695 = $697;$c$2$i = $198;$gotdig$2$i = $gotdig$3$i;$gotrad$0$i = $gotrad$1$i;$gottail$0$i = $gottail$2$i;$scale$0$i = $scale$2$i;$x$0$i = $x$2$i;$y$0$i = $y$2$i;
          continue;
         }
        }
        $199 = ($gotdig$2$i$lcssa|0)==(0);
        if ($199) {
         $200 = HEAP32[$1>>2]|0;
         $201 = ($200|0)==(0|0);
         if (!($201)) {
          $202 = HEAP32[$0>>2]|0;
          $203 = ((($202)) + -1|0);
          HEAP32[$0>>2] = $203;
         }
         $204 = ($pok|0)==(0);
         if ($204) {
          ___shlim($f,0);
         } else {
          if (!($201)) {
           $205 = HEAP32[$0>>2]|0;
           $206 = ((($205)) + -1|0);
           HEAP32[$0>>2] = $206;
           $207 = ($gotrad$0$i$lcssa|0)==(0);
           if (!($207)) {
            $208 = ((($205)) + -2|0);
            HEAP32[$0>>2] = $208;
           }
          }
         }
         $209 = (+($sign$0|0));
         $210 = $209 * 0.0;
         $$0 = $210;
         break L4;
        }
        $211 = ($gotrad$0$i$lcssa|0)==(0);
        $214 = $211 ? $213 : $212;
        $217 = $211 ? $216 : $215;
        $218 = ($216|0)<(0);
        $219 = ($213>>>0)<(8);
        $220 = ($216|0)==(0);
        $221 = $220 & $219;
        $222 = $218 | $221;
        if ($222) {
         $224 = $213;$225 = $216;$x$324$i = $x$0$i$lcssa;
         while(1) {
          $223 = $x$324$i << 4;
          $226 = (_i64Add(($224|0),($225|0),1,0)|0);
          $227 = tempRet0;
          $228 = ($227|0)<(0);
          $229 = ($226>>>0)<(8);
          $230 = ($227|0)==(0);
          $231 = $230 & $229;
          $232 = $228 | $231;
          if ($232) {
           $224 = $226;$225 = $227;$x$324$i = $223;
          } else {
           $x$3$lcssa$i = $223;
           break;
          }
         }
        } else {
         $x$3$lcssa$i = $x$0$i$lcssa;
        }
        $233 = $c$2$lcssa$i | 32;
        $234 = ($233|0)==(112);
        if ($234) {
         $235 = (_scanexp($f,$pok)|0);
         $236 = tempRet0;
         $237 = ($235|0)==(0);
         $238 = ($236|0)==(-2147483648);
         $239 = $237 & $238;
         if ($239) {
          $240 = ($pok|0)==(0);
          if ($240) {
           ___shlim($f,0);
           $$0 = 0.0;
           break L4;
          }
          $241 = HEAP32[$1>>2]|0;
          $242 = ($241|0)==(0|0);
          if ($242) {
           $253 = 0;$254 = 0;
          } else {
           $243 = HEAP32[$0>>2]|0;
           $244 = ((($243)) + -1|0);
           HEAP32[$0>>2] = $244;
           $253 = 0;$254 = 0;
          }
         } else {
          $253 = $235;$254 = $236;
         }
        } else {
         $245 = HEAP32[$1>>2]|0;
         $246 = ($245|0)==(0|0);
         if ($246) {
          $253 = 0;$254 = 0;
         } else {
          $247 = HEAP32[$0>>2]|0;
          $248 = ((($247)) + -1|0);
          HEAP32[$0>>2] = $248;
          $253 = 0;$254 = 0;
         }
        }
        $249 = (_bitshift64Shl(($214|0),($217|0),2)|0);
        $250 = tempRet0;
        $251 = (_i64Add(($249|0),($250|0),-32,-1)|0);
        $252 = tempRet0;
        $255 = (_i64Add(($251|0),($252|0),($253|0),($254|0))|0);
        $256 = tempRet0;
        $257 = ($x$3$lcssa$i|0)==(0);
        if ($257) {
         $258 = (+($sign$0|0));
         $259 = $258 * 0.0;
         $$0 = $259;
         break L4;
        }
        $260 = (0 - ($emin$0$ph))|0;
        $261 = ($256|0)>(0);
        $262 = ($255>>>0)>($260>>>0);
        $263 = ($256|0)==(0);
        $264 = $263 & $262;
        $265 = $261 | $264;
        if ($265) {
         $266 = (___errno_location()|0);
         HEAP32[$266>>2] = 34;
         $267 = (+($sign$0|0));
         $268 = $267 * 1.7976931348623157E+308;
         $269 = $268 * 1.7976931348623157E+308;
         $$0 = $269;
         break L4;
        }
        $270 = (($emin$0$ph) + -106)|0;
        $271 = ($270|0)<(0);
        $272 = $271 << 31 >> 31;
        $273 = ($256|0)<($272|0);
        $274 = ($255>>>0)<($270>>>0);
        $275 = ($256|0)==($272|0);
        $276 = $275 & $274;
        $277 = $273 | $276;
        if ($277) {
         $279 = (___errno_location()|0);
         HEAP32[$279>>2] = 34;
         $280 = (+($sign$0|0));
         $281 = $280 * 2.2250738585072014E-308;
         $282 = $281 * 2.2250738585072014E-308;
         $$0 = $282;
         break L4;
        }
        $278 = ($x$3$lcssa$i|0)>(-1);
        if ($278) {
         $288 = $255;$289 = $256;$x$419$i = $x$3$lcssa$i;$y$320$i = $y$0$i$lcssa;
         while(1) {
          $283 = !($y$320$i >= 0.5);
          $284 = $x$419$i << 1;
          $285 = $y$320$i + -1.0;
          $286 = $283&1;
          $287 = $286 | $284;
          $x$5$i = $287 ^ 1;
          $$pn$i = $283 ? $y$320$i : $285;
          $y$4$i = $y$320$i + $$pn$i;
          $290 = (_i64Add(($288|0),($289|0),-1,-1)|0);
          $291 = tempRet0;
          $292 = ($287|0)>(-1);
          if ($292) {
           $288 = $290;$289 = $291;$x$419$i = $x$5$i;$y$320$i = $y$4$i;
          } else {
           $297 = $290;$298 = $291;$x$4$lcssa$i = $x$5$i;$y$3$lcssa$i = $y$4$i;
           break;
          }
         }
        } else {
         $297 = $255;$298 = $256;$x$4$lcssa$i = $x$3$lcssa$i;$y$3$lcssa$i = $y$0$i$lcssa;
        }
        $293 = ($emin$0$ph|0)<(0);
        $294 = $293 << 31 >> 31;
        $295 = (_i64Subtract(32,0,($emin$0$ph|0),($294|0))|0);
        $296 = tempRet0;
        $299 = (_i64Add(($297|0),($298|0),($295|0),($296|0))|0);
        $300 = tempRet0;
        $301 = (0)>($300|0);
        $302 = ($bits$0$ph>>>0)>($299>>>0);
        $303 = (0)==($300|0);
        $304 = $303 & $302;
        $305 = $301 | $304;
        if ($305) {
         $306 = ($299|0)<(0);
         if ($306) {
          $$0710$i = 0;
          label = 127;
         } else {
          $$07$i = $299;
          label = 125;
         }
        } else {
         $$07$i = $bits$0$ph;
         label = 125;
        }
        if ((label|0) == 125) {
         $307 = ($$07$i|0)<(53);
         if ($307) {
          $$0710$i = $$07$i;
          label = 127;
         } else {
          $$pre41$i = (+($sign$0|0));
          $$0711$i = $$07$i;$$pre$phi42$iZ2D = $$pre41$i;$bias$0$i = 0.0;
         }
        }
        if ((label|0) == 127) {
         $308 = (84 - ($$0710$i))|0;
         $309 = (+_scalbn(1.0,$308));
         $310 = (+($sign$0|0));
         $311 = (+_copysignl($309,$310));
         $$0711$i = $$0710$i;$$pre$phi42$iZ2D = $310;$bias$0$i = $311;
        }
        $312 = ($$0711$i|0)<(32);
        $313 = $y$3$lcssa$i != 0.0;
        $or$cond4$i = $313 & $312;
        $314 = $x$4$lcssa$i & 1;
        $315 = ($314|0)==(0);
        $or$cond9$i = $315 & $or$cond4$i;
        $316 = $or$cond9$i&1;
        $x$6$i = (($316) + ($x$4$lcssa$i))|0;
        $y$5$i = $or$cond9$i ? 0.0 : $y$3$lcssa$i;
        $317 = (+($x$6$i>>>0));
        $318 = $$pre$phi42$iZ2D * $317;
        $319 = $bias$0$i + $318;
        $320 = $$pre$phi42$iZ2D * $y$5$i;
        $321 = $320 + $319;
        $322 = $321 - $bias$0$i;
        $323 = $322 != 0.0;
        if (!($323)) {
         $324 = (___errno_location()|0);
         HEAP32[$324>>2] = 34;
        }
        $325 = (+_scalbnl($322,$297));
        $$0 = $325;
        break L4;
       } else {
        $c$6 = $c$5;
       }
      } while(0);
      $sum$i = (($emin$0$ph) + ($bits$0$ph))|0;
      $330 = (0 - ($sum$i))|0;
      $$09$i = $c$6;$gotdig$0$i12 = 0;
      L184: while(1) {
       switch ($$09$i|0) {
       case 46:  {
        $gotdig$0$i12$lcssa273 = $gotdig$0$i12;
        label = 138;
        break L184;
        break;
       }
       case 48:  {
        break;
       }
       default: {
        $$2$i = $$09$i;$700 = 0;$701 = 0;$gotdig$2$i13 = $gotdig$0$i12;$gotrad$0$i14 = 0;
        break L184;
       }
       }
       $331 = HEAP32[$0>>2]|0;
       $332 = HEAP32[$1>>2]|0;
       $333 = ($331>>>0)<($332>>>0);
       if ($333) {
        $334 = ((($331)) + 1|0);
        HEAP32[$0>>2] = $334;
        $335 = HEAP8[$331>>0]|0;
        $336 = $335&255;
        $$09$i = $336;$gotdig$0$i12 = 1;
        continue;
       } else {
        $337 = (___shgetc($f)|0);
        $$09$i = $337;$gotdig$0$i12 = 1;
        continue;
       }
      }
      if ((label|0) == 138) {
       $338 = HEAP32[$0>>2]|0;
       $339 = HEAP32[$1>>2]|0;
       $340 = ($338>>>0)<($339>>>0);
       if ($340) {
        $341 = ((($338)) + 1|0);
        HEAP32[$0>>2] = $341;
        $342 = HEAP8[$338>>0]|0;
        $343 = $342&255;
        $$1$ph$i = $343;
       } else {
        $344 = (___shgetc($f)|0);
        $$1$ph$i = $344;
       }
       $345 = ($$1$ph$i|0)==(48);
       if ($345) {
        $346 = 0;$347 = 0;
        while(1) {
         $348 = (_i64Add(($346|0),($347|0),-1,-1)|0);
         $349 = tempRet0;
         $350 = HEAP32[$0>>2]|0;
         $351 = HEAP32[$1>>2]|0;
         $352 = ($350>>>0)<($351>>>0);
         if ($352) {
          $353 = ((($350)) + 1|0);
          HEAP32[$0>>2] = $353;
          $354 = HEAP8[$350>>0]|0;
          $355 = $354&255;
          $$1$be$i = $355;
         } else {
          $356 = (___shgetc($f)|0);
          $$1$be$i = $356;
         }
         $357 = ($$1$be$i|0)==(48);
         if ($357) {
          $346 = $348;$347 = $349;
         } else {
          $$2$i = $$1$be$i;$700 = $348;$701 = $349;$gotdig$2$i13 = 1;$gotrad$0$i14 = 1;
          break;
         }
        }
       } else {
        $$2$i = $$1$ph$i;$700 = 0;$701 = 0;$gotdig$2$i13 = $gotdig$0$i12$lcssa273;$gotrad$0$i14 = 1;
       }
      }
      HEAP32[$x$i>>2] = 0;
      $358 = (($$2$i) + -48)|0;
      $359 = ($358>>>0)<(10);
      $360 = ($$2$i|0)==(46);
      $361 = $360 | $359;
      L203: do {
       if ($361) {
        $362 = ((($x$i)) + 496|0);
        $$3105$i = $$2$i;$365 = 0;$366 = 0;$702 = $360;$703 = $358;$704 = $700;$705 = $701;$gotdig$3101$i = $gotdig$2$i13;$gotrad$1102$i = $gotrad$0$i14;$j$0104$i = 0;$k$0103$i = 0;$lnz$0100$i = 0;
        L205: while(1) {
         do {
          if ($702) {
           $cond$i = ($gotrad$1102$i|0)==(0);
           if ($cond$i) {
            $706 = $365;$707 = $366;$708 = $365;$709 = $366;$gotdig$4$i = $gotdig$3101$i;$gotrad$2$i = 1;$j$2$i = $j$0104$i;$k$2$i = $k$0103$i;$lnz$2$i = $lnz$0100$i;
           } else {
            $710 = $704;$711 = $705;$712 = $365;$713 = $366;$gotdig$3101$i$lcssa = $gotdig$3101$i;$j$0104$i$lcssa = $j$0104$i;$k$0103$i$lcssa = $k$0103$i;$lnz$0100$i$lcssa = $lnz$0100$i;
            break L205;
           }
          } else {
           $364 = ($k$0103$i|0)<(125);
           $367 = (_i64Add(($365|0),($366|0),1,0)|0);
           $368 = tempRet0;
           $369 = ($$3105$i|0)!=(48);
           if (!($364)) {
            if (!($369)) {
             $706 = $704;$707 = $705;$708 = $367;$709 = $368;$gotdig$4$i = $gotdig$3101$i;$gotrad$2$i = $gotrad$1102$i;$j$2$i = $j$0104$i;$k$2$i = $k$0103$i;$lnz$2$i = $lnz$0100$i;
             break;
            }
            $379 = HEAP32[$362>>2]|0;
            $380 = $379 | 1;
            HEAP32[$362>>2] = $380;
            $706 = $704;$707 = $705;$708 = $367;$709 = $368;$gotdig$4$i = $gotdig$3101$i;$gotrad$2$i = $gotrad$1102$i;$j$2$i = $j$0104$i;$k$2$i = $k$0103$i;$lnz$2$i = $lnz$0100$i;
            break;
           }
           $$lnz$0$i = $369 ? $367 : $lnz$0100$i;
           $370 = ($j$0104$i|0)==(0);
           $371 = (($x$i) + ($k$0103$i<<2)|0);
           if ($370) {
            $storemerge$i = $703;
           } else {
            $372 = HEAP32[$371>>2]|0;
            $373 = ($372*10)|0;
            $374 = (($$3105$i) + -48)|0;
            $375 = (($374) + ($373))|0;
            $storemerge$i = $375;
           }
           HEAP32[$371>>2] = $storemerge$i;
           $376 = (($j$0104$i) + 1)|0;
           $377 = ($376|0)==(9);
           $378 = $377&1;
           $$k$0$i = (($378) + ($k$0103$i))|0;
           $$11$i = $377 ? 0 : $376;
           $706 = $704;$707 = $705;$708 = $367;$709 = $368;$gotdig$4$i = 1;$gotrad$2$i = $gotrad$1102$i;$j$2$i = $$11$i;$k$2$i = $$k$0$i;$lnz$2$i = $$lnz$0$i;
          }
         } while(0);
         $381 = HEAP32[$0>>2]|0;
         $382 = HEAP32[$1>>2]|0;
         $383 = ($381>>>0)<($382>>>0);
         if ($383) {
          $384 = ((($381)) + 1|0);
          HEAP32[$0>>2] = $384;
          $385 = HEAP8[$381>>0]|0;
          $386 = $385&255;
          $$3$be$i = $386;
         } else {
          $387 = (___shgetc($f)|0);
          $$3$be$i = $387;
         }
         $388 = (($$3$be$i) + -48)|0;
         $389 = ($388>>>0)<(10);
         $390 = ($$3$be$i|0)==(46);
         $391 = $390 | $389;
         if ($391) {
          $$3105$i = $$3$be$i;$365 = $708;$366 = $709;$702 = $390;$703 = $388;$704 = $706;$705 = $707;$gotdig$3101$i = $gotdig$4$i;$gotrad$1102$i = $gotrad$2$i;$j$0104$i = $j$2$i;$k$0103$i = $k$2$i;$lnz$0100$i = $lnz$2$i;
         } else {
          $$3$lcssa$i = $$3$be$i;$393 = $706;$394 = $708;$396 = $707;$397 = $709;$gotdig$3$lcssa$i = $gotdig$4$i;$gotrad$1$lcssa$i = $gotrad$2$i;$j$0$lcssa$i = $j$2$i;$k$0$lcssa$i = $k$2$i;$lnz$0$lcssa$i = $lnz$2$i;
          label = 161;
          break L203;
         }
        }
        $363 = ($gotdig$3101$i$lcssa|0)!=(0);
        $714 = $712;$715 = $713;$716 = $710;$717 = $711;$718 = $363;$j$069$i = $j$0104$i$lcssa;$k$065$i = $k$0103$i$lcssa;$lnz$059$i = $lnz$0100$i$lcssa;
        label = 169;
       } else {
        $$3$lcssa$i = $$2$i;$393 = $700;$394 = 0;$396 = $701;$397 = 0;$gotdig$3$lcssa$i = $gotdig$2$i13;$gotrad$1$lcssa$i = $gotrad$0$i14;$j$0$lcssa$i = 0;$k$0$lcssa$i = 0;$lnz$0$lcssa$i = 0;
        label = 161;
       }
      } while(0);
      do {
       if ((label|0) == 161) {
        $392 = ($gotrad$1$lcssa$i|0)==(0);
        $395 = $392 ? $394 : $393;
        $398 = $392 ? $397 : $396;
        $399 = ($gotdig$3$lcssa$i|0)!=(0);
        $400 = $$3$lcssa$i | 32;
        $401 = ($400|0)==(101);
        $or$cond13$i = $401 & $399;
        if (!($or$cond13$i)) {
         $416 = ($$3$lcssa$i|0)>(-1);
         if ($416) {
          $714 = $394;$715 = $397;$716 = $395;$717 = $398;$718 = $399;$j$069$i = $j$0$lcssa$i;$k$065$i = $k$0$lcssa$i;$lnz$059$i = $lnz$0$lcssa$i;
          label = 169;
          break;
         } else {
          $719 = $394;$720 = $397;$721 = $399;$722 = $395;$723 = $398;$j$068$i = $j$0$lcssa$i;$k$064$i = $k$0$lcssa$i;$lnz$058$i = $lnz$0$lcssa$i;
          label = 171;
          break;
         }
        }
        $402 = (_scanexp($f,$pok)|0);
        $403 = tempRet0;
        $404 = ($402|0)==(0);
        $405 = ($403|0)==(-2147483648);
        $406 = $404 & $405;
        if ($406) {
         $407 = ($pok|0)==(0);
         if ($407) {
          ___shlim($f,0);
          $$0$i27 = 0.0;
          break;
         }
         $408 = HEAP32[$1>>2]|0;
         $409 = ($408|0)==(0|0);
         if ($409) {
          $412 = 0;$413 = 0;
         } else {
          $410 = HEAP32[$0>>2]|0;
          $411 = ((($410)) + -1|0);
          HEAP32[$0>>2] = $411;
          $412 = 0;$413 = 0;
         }
        } else {
         $412 = $402;$413 = $403;
        }
        $414 = (_i64Add(($412|0),($413|0),($395|0),($398|0))|0);
        $415 = tempRet0;
        $426 = $414;$428 = $394;$429 = $415;$431 = $397;$j$067$i = $j$0$lcssa$i;$k$063$i = $k$0$lcssa$i;$lnz$057$i = $lnz$0$lcssa$i;
        label = 173;
       }
      } while(0);
      if ((label|0) == 169) {
       $417 = HEAP32[$1>>2]|0;
       $418 = ($417|0)==(0|0);
       if ($418) {
        $719 = $714;$720 = $715;$721 = $718;$722 = $716;$723 = $717;$j$068$i = $j$069$i;$k$064$i = $k$065$i;$lnz$058$i = $lnz$059$i;
        label = 171;
       } else {
        $419 = HEAP32[$0>>2]|0;
        $420 = ((($419)) + -1|0);
        HEAP32[$0>>2] = $420;
        if ($718) {
         $426 = $716;$428 = $714;$429 = $717;$431 = $715;$j$067$i = $j$069$i;$k$063$i = $k$065$i;$lnz$057$i = $lnz$059$i;
         label = 173;
        } else {
         label = 172;
        }
       }
      }
      if ((label|0) == 171) {
       if ($721) {
        $426 = $722;$428 = $719;$429 = $723;$431 = $720;$j$067$i = $j$068$i;$k$063$i = $k$064$i;$lnz$057$i = $lnz$058$i;
        label = 173;
       } else {
        label = 172;
       }
      }
      do {
       if ((label|0) == 172) {
        $421 = (___errno_location()|0);
        HEAP32[$421>>2] = 22;
        ___shlim($f,0);
        $$0$i27 = 0.0;
       }
       else if ((label|0) == 173) {
        $422 = HEAP32[$x$i>>2]|0;
        $423 = ($422|0)==(0);
        if ($423) {
         $424 = (+($sign$0|0));
         $425 = $424 * 0.0;
         $$0$i27 = $425;
         break;
        }
        $427 = ($426|0)==($428|0);
        $430 = ($429|0)==($431|0);
        $432 = $427 & $430;
        $433 = ($431|0)<(0);
        $434 = ($428>>>0)<(10);
        $435 = ($431|0)==(0);
        $436 = $435 & $434;
        $437 = $433 | $436;
        $or$cond$i16 = $437 & $432;
        if ($or$cond$i16) {
         $438 = ($bits$0$ph>>>0)>(30);
         $439 = $422 >>> $bits$0$ph;
         $440 = ($439|0)==(0);
         $or$cond15$i = $438 | $440;
         if ($or$cond15$i) {
          $441 = (+($sign$0|0));
          $442 = (+($422>>>0));
          $443 = $441 * $442;
          $$0$i27 = $443;
          break;
         }
        }
        $444 = (($emin$0$ph|0) / -2)&-1;
        $445 = ($444|0)<(0);
        $446 = $445 << 31 >> 31;
        $447 = ($429|0)>($446|0);
        $448 = ($426>>>0)>($444>>>0);
        $449 = ($429|0)==($446|0);
        $450 = $449 & $448;
        $451 = $447 | $450;
        if ($451) {
         $452 = (___errno_location()|0);
         HEAP32[$452>>2] = 34;
         $453 = (+($sign$0|0));
         $454 = $453 * 1.7976931348623157E+308;
         $455 = $454 * 1.7976931348623157E+308;
         $$0$i27 = $455;
         break;
        }
        $456 = (($emin$0$ph) + -106)|0;
        $457 = ($456|0)<(0);
        $458 = $457 << 31 >> 31;
        $459 = ($429|0)<($458|0);
        $460 = ($426>>>0)<($456>>>0);
        $461 = ($429|0)==($458|0);
        $462 = $461 & $460;
        $463 = $459 | $462;
        if ($463) {
         $464 = (___errno_location()|0);
         HEAP32[$464>>2] = 34;
         $465 = (+($sign$0|0));
         $466 = $465 * 2.2250738585072014E-308;
         $467 = $466 * 2.2250738585072014E-308;
         $$0$i27 = $467;
         break;
        }
        $468 = ($j$067$i|0)==(0);
        if ($468) {
         $k$3$i = $k$063$i;
        } else {
         $469 = ($j$067$i|0)<(9);
         if ($469) {
          $470 = (($x$i) + ($k$063$i<<2)|0);
          $$promoted$i = HEAP32[$470>>2]|0;
          $472 = $$promoted$i;$j$394$i = $j$067$i;
          while(1) {
           $471 = ($472*10)|0;
           $473 = (($j$394$i) + 1)|0;
           $exitcond$i = ($473|0)==(9);
           if ($exitcond$i) {
            $$lcssa265 = $471;
            break;
           } else {
            $472 = $471;$j$394$i = $473;
           }
          }
          HEAP32[$470>>2] = $$lcssa265;
         }
         $474 = (($k$063$i) + 1)|0;
         $k$3$i = $474;
        }
        $475 = ($lnz$057$i|0)<(9);
        if ($475) {
         $476 = ($lnz$057$i|0)<=($426|0);
         $477 = ($426|0)<(18);
         $or$cond3$i = $476 & $477;
         if ($or$cond3$i) {
          $478 = ($426|0)==(9);
          if ($478) {
           $479 = (+($sign$0|0));
           $480 = HEAP32[$x$i>>2]|0;
           $481 = (+($480>>>0));
           $482 = $479 * $481;
           $$0$i27 = $482;
           break;
          }
          $483 = ($426|0)<(9);
          if ($483) {
           $484 = (+($sign$0|0));
           $485 = HEAP32[$x$i>>2]|0;
           $486 = (+($485>>>0));
           $487 = $484 * $486;
           $488 = (8 - ($426))|0;
           $489 = (56980 + ($488<<2)|0);
           $490 = HEAP32[$489>>2]|0;
           $491 = (+($490|0));
           $492 = $487 / $491;
           $$0$i27 = $492;
           break;
          }
          $$neg32$i = (($bits$0$ph) + 27)|0;
          $493 = Math_imul($426, -3)|0;
          $494 = (($$neg32$i) + ($493))|0;
          $495 = ($494|0)>(30);
          $$pre$i17 = HEAP32[$x$i>>2]|0;
          $496 = $$pre$i17 >>> $494;
          $497 = ($496|0)==(0);
          $or$cond182$i = $495 | $497;
          if ($or$cond182$i) {
           $498 = (+($sign$0|0));
           $499 = (+($$pre$i17>>>0));
           $500 = $498 * $499;
           $501 = (($426) + -10)|0;
           $502 = (56980 + ($501<<2)|0);
           $503 = HEAP32[$502>>2]|0;
           $504 = (+($503|0));
           $505 = $500 * $504;
           $$0$i27 = $505;
           break;
          }
         }
        }
        $506 = (($426|0) % 9)&-1;
        $507 = ($506|0)==(0);
        if ($507) {
         $a$2$ph38$i = 0;$e2$0$ph$i = 0;$rp$2$ph36$i = $426;$z$1$ph37$i = $k$3$i;
        } else {
         $508 = ($426|0)>(-1);
         $509 = (($506) + 9)|0;
         $510 = $508 ? $506 : $509;
         $511 = (8 - ($510))|0;
         $512 = (56980 + ($511<<2)|0);
         $513 = HEAP32[$512>>2]|0;
         $514 = ($k$3$i|0)==(0);
         if ($514) {
          $a$0$lcssa151$i = 0;$rp$0$lcssa152$i = $426;$z$0$i = 0;
         } else {
          $515 = (1000000000 / ($513|0))&-1;
          $a$085$i = 0;$carry$087$i = 0;$k$486$i = 0;$rp$084$i = $426;
          while(1) {
           $516 = (($x$i) + ($k$486$i<<2)|0);
           $517 = HEAP32[$516>>2]|0;
           $518 = (($517>>>0) % ($513>>>0))&-1;
           $519 = (($517>>>0) / ($513>>>0))&-1;
           $520 = (($519) + ($carry$087$i))|0;
           HEAP32[$516>>2] = $520;
           $521 = Math_imul($518, $515)|0;
           $522 = ($k$486$i|0)==($a$085$i|0);
           $523 = ($520|0)==(0);
           $or$cond16$i = $522 & $523;
           $524 = (($k$486$i) + 1)|0;
           $525 = $524 & 127;
           $526 = (($rp$084$i) + -9)|0;
           $rp$1$i18 = $or$cond16$i ? $526 : $rp$084$i;
           $a$1$i = $or$cond16$i ? $525 : $a$085$i;
           $527 = ($524|0)==($k$3$i|0);
           if ($527) {
            $$lcssa264 = $521;$a$1$i$lcssa = $a$1$i;$rp$1$i18$lcssa = $rp$1$i18;
            break;
           } else {
            $a$085$i = $a$1$i;$carry$087$i = $521;$k$486$i = $524;$rp$084$i = $rp$1$i18;
           }
          }
          $528 = ($$lcssa264|0)==(0);
          if ($528) {
           $a$0$lcssa151$i = $a$1$i$lcssa;$rp$0$lcssa152$i = $rp$1$i18$lcssa;$z$0$i = $k$3$i;
          } else {
           $529 = (($k$3$i) + 1)|0;
           $530 = (($x$i) + ($k$3$i<<2)|0);
           HEAP32[$530>>2] = $$lcssa264;
           $a$0$lcssa151$i = $a$1$i$lcssa;$rp$0$lcssa152$i = $rp$1$i18$lcssa;$z$0$i = $529;
          }
         }
         $531 = (9 - ($510))|0;
         $532 = (($531) + ($rp$0$lcssa152$i))|0;
         $a$2$ph38$i = $a$0$lcssa151$i;$e2$0$ph$i = 0;$rp$2$ph36$i = $532;$z$1$ph37$i = $z$0$i;
        }
        L284: while(1) {
         $533 = ($rp$2$ph36$i|0)<(18);
         $534 = ($rp$2$ph36$i|0)==(18);
         $535 = (($x$i) + ($a$2$ph38$i<<2)|0);
         $e2$0$i19 = $e2$0$ph$i;$z$1$i = $z$1$ph37$i;
         while(1) {
          if (!($533)) {
           if (!($534)) {
            $a$3$ph$i = $a$2$ph38$i;$e2$1$ph$i = $e2$0$i19;$rp$3$ph34$i = $rp$2$ph36$i;$z$5$ph$i = $z$1$i;
            break L284;
           }
           $536 = HEAP32[$535>>2]|0;
           $537 = ($536>>>0)<(9007199);
           if (!($537)) {
            $a$3$ph$i = $a$2$ph38$i;$e2$1$ph$i = $e2$0$i19;$rp$3$ph34$i = 18;$z$5$ph$i = $z$1$i;
            break L284;
           }
          }
          $538 = (($z$1$i) + 127)|0;
          $carry1$0$i = 0;$k$5$in$i = $538;$z$2$i = $z$1$i;
          while(1) {
           $k$5$i = $k$5$in$i & 127;
           $539 = (($x$i) + ($k$5$i<<2)|0);
           $540 = HEAP32[$539>>2]|0;
           $541 = (_bitshift64Shl(($540|0),0,29)|0);
           $542 = tempRet0;
           $543 = (_i64Add(($541|0),($542|0),($carry1$0$i|0),0)|0);
           $544 = tempRet0;
           $545 = ($544>>>0)>(0);
           $546 = ($543>>>0)>(1000000000);
           $547 = ($544|0)==(0);
           $548 = $547 & $546;
           $549 = $545 | $548;
           if ($549) {
            $550 = (___udivdi3(($543|0),($544|0),1000000000,0)|0);
            $551 = tempRet0;
            $552 = (___uremdi3(($543|0),($544|0),1000000000,0)|0);
            $553 = tempRet0;
            $$sink$off0$i = $552;$carry1$1$i = $550;
           } else {
            $$sink$off0$i = $543;$carry1$1$i = 0;
           }
           HEAP32[$539>>2] = $$sink$off0$i;
           $554 = (($z$2$i) + 127)|0;
           $555 = $554 & 127;
           $556 = ($k$5$i|0)!=($555|0);
           $557 = ($k$5$i|0)==($a$2$ph38$i|0);
           $or$cond17$i = $556 | $557;
           $558 = ($$sink$off0$i|0)==(0);
           $k$5$z$2$i = $558 ? $k$5$i : $z$2$i;
           $z$3$i = $or$cond17$i ? $z$2$i : $k$5$z$2$i;
           $559 = (($k$5$i) + -1)|0;
           if ($557) {
            $carry1$1$i$lcssa = $carry1$1$i;$z$3$i$lcssa = $z$3$i;
            break;
           } else {
            $carry1$0$i = $carry1$1$i;$k$5$in$i = $559;$z$2$i = $z$3$i;
           }
          }
          $560 = (($e2$0$i19) + -29)|0;
          $561 = ($carry1$1$i$lcssa|0)==(0);
          if ($561) {
           $e2$0$i19 = $560;$z$1$i = $z$3$i$lcssa;
          } else {
           $$lcssa263 = $560;$carry1$1$i$lcssa$lcssa = $carry1$1$i$lcssa;$z$3$i$lcssa$lcssa = $z$3$i$lcssa;
           break;
          }
         }
         $562 = (($rp$2$ph36$i) + 9)|0;
         $563 = (($a$2$ph38$i) + 127)|0;
         $564 = $563 & 127;
         $565 = ($564|0)==($z$3$i$lcssa$lcssa|0);
         if ($565) {
          $566 = (($z$3$i$lcssa$lcssa) + 127)|0;
          $567 = $566 & 127;
          $568 = (($x$i) + ($567<<2)|0);
          $569 = HEAP32[$568>>2]|0;
          $570 = (($z$3$i$lcssa$lcssa) + 126)|0;
          $571 = $570 & 127;
          $572 = (($x$i) + ($571<<2)|0);
          $573 = HEAP32[$572>>2]|0;
          $574 = $573 | $569;
          HEAP32[$572>>2] = $574;
          $z$4$i = $567;
         } else {
          $z$4$i = $z$3$i$lcssa$lcssa;
         }
         $575 = (($x$i) + ($564<<2)|0);
         HEAP32[$575>>2] = $carry1$1$i$lcssa$lcssa;
         $a$2$ph38$i = $564;$e2$0$ph$i = $$lcssa263;$rp$2$ph36$i = $562;$z$1$ph37$i = $z$4$i;
        }
        L302: while(1) {
         $606 = (($z$5$ph$i) + 1)|0;
         $603 = $606 & 127;
         $607 = (($z$5$ph$i) + 127)|0;
         $608 = $607 & 127;
         $609 = (($x$i) + ($608<<2)|0);
         $a$3$ph157$i = $a$3$ph$i;$e2$1$ph156$i = $e2$1$ph$i;$rp$3$ph$i = $rp$3$ph34$i;
         while(1) {
          $610 = ($rp$3$ph$i|0)==(18);
          $611 = ($rp$3$ph$i|0)>(27);
          $$18$i = $611 ? 9 : 1;
          $$not$i = $610 ^ 1;
          $a$3$i = $a$3$ph157$i;$e2$1$i = $e2$1$ph156$i;
          while(1) {
           $576 = $a$3$i & 127;
           $577 = ($576|0)==($z$5$ph$i|0);
           do {
            if ($577) {
             label = 219;
            } else {
             $578 = (($x$i) + ($576<<2)|0);
             $579 = HEAP32[$578>>2]|0;
             $580 = ($579>>>0)<(9007199);
             if ($580) {
              label = 219;
              break;
             }
             $581 = ($579>>>0)>(9007199);
             if ($581) {
              break;
             }
             $582 = (($a$3$i) + 1)|0;
             $583 = $582 & 127;
             $584 = ($583|0)==($z$5$ph$i|0);
             if ($584) {
              label = 219;
              break;
             }
             $690 = (($x$i) + ($583<<2)|0);
             $691 = HEAP32[$690>>2]|0;
             $692 = ($691>>>0)<(254740991);
             if ($692) {
              label = 219;
              break;
             }
             $693 = ($691>>>0)>(254740991);
             $brmerge$i28 = $693 | $$not$i;
             if (!($brmerge$i28)) {
              $617 = $576;$a$3$i249 = $a$3$i;$e2$1$i246 = $e2$1$i;$z$7$i = $z$5$ph$i;
              break L302;
             }
            }
           } while(0);
           if ((label|0) == 219) {
            label = 0;
            if ($610) {
             label = 220;
             break L302;
            }
           }
           $585 = (($e2$1$i) + ($$18$i))|0;
           $586 = ($a$3$i|0)==($z$5$ph$i|0);
           if ($586) {
            $a$3$i = $z$5$ph$i;$e2$1$i = $585;
           } else {
            $$lcssa256 = $585;$a$3$i$lcssa248 = $a$3$i;
            break;
           }
          }
          $587 = 1 << $$18$i;
          $588 = (($587) + -1)|0;
          $589 = 1000000000 >>> $$18$i;
          $a$478$i = $a$3$i$lcssa248;$carry3$081$i = 0;$k$679$i = $a$3$i$lcssa248;$rp$477$i = $rp$3$ph$i;
          while(1) {
           $590 = (($x$i) + ($k$679$i<<2)|0);
           $591 = HEAP32[$590>>2]|0;
           $592 = $591 & $588;
           $593 = $591 >>> $$18$i;
           $594 = (($593) + ($carry3$081$i))|0;
           HEAP32[$590>>2] = $594;
           $595 = Math_imul($592, $589)|0;
           $596 = ($k$679$i|0)==($a$478$i|0);
           $597 = ($594|0)==(0);
           $or$cond19$i = $596 & $597;
           $598 = (($k$679$i) + 1)|0;
           $599 = $598 & 127;
           $600 = (($rp$477$i) + -9)|0;
           $rp$5$i = $or$cond19$i ? $600 : $rp$477$i;
           $a$5$i = $or$cond19$i ? $599 : $a$478$i;
           $601 = ($599|0)==($z$5$ph$i|0);
           if ($601) {
            $$lcssa257 = $595;$a$5$i$lcssa = $a$5$i;$rp$5$i$lcssa = $rp$5$i;
            break;
           } else {
            $a$478$i = $a$5$i;$carry3$081$i = $595;$k$679$i = $599;$rp$477$i = $rp$5$i;
           }
          }
          $602 = ($$lcssa257|0)==(0);
          if ($602) {
           $a$3$ph157$i = $a$5$i$lcssa;$e2$1$ph156$i = $$lcssa256;$rp$3$ph$i = $rp$5$i$lcssa;
           continue;
          }
          $604 = ($603|0)==($a$5$i$lcssa|0);
          if (!($604)) {
           $$lcssa256$lcssa = $$lcssa256;$$lcssa257$lcssa = $$lcssa257;$a$5$i$lcssa$lcssa = $a$5$i$lcssa;$rp$5$i$lcssa$lcssa = $rp$5$i$lcssa;
           break;
          }
          $612 = HEAP32[$609>>2]|0;
          $613 = $612 | 1;
          HEAP32[$609>>2] = $613;
          $a$3$ph157$i = $a$5$i$lcssa;$e2$1$ph156$i = $$lcssa256;$rp$3$ph$i = $rp$5$i$lcssa;
         }
         $605 = (($x$i) + ($z$5$ph$i<<2)|0);
         HEAP32[$605>>2] = $$lcssa257$lcssa;
         $a$3$ph$i = $a$5$i$lcssa$lcssa;$e2$1$ph$i = $$lcssa256$lcssa;$rp$3$ph34$i = $rp$5$i$lcssa$lcssa;$z$5$ph$i = $603;
        }
        if ((label|0) == 220) {
         if ($577) {
          $614 = (($603) + -1)|0;
          $615 = (($x$i) + ($614<<2)|0);
          HEAP32[$615>>2] = 0;
          $617 = $z$5$ph$i;$a$3$i249 = $a$3$i;$e2$1$i246 = $e2$1$i;$z$7$i = $603;
         } else {
          $617 = $576;$a$3$i249 = $a$3$i;$e2$1$i246 = $e2$1$i;$z$7$i = $z$5$ph$i;
         }
        }
        $616 = (($x$i) + ($617<<2)|0);
        $618 = HEAP32[$616>>2]|0;
        $619 = (+($618>>>0));
        $620 = (($a$3$i249) + 1)|0;
        $621 = $620 & 127;
        $622 = ($621|0)==($z$7$i|0);
        if ($622) {
         $679 = (($a$3$i249) + 2)|0;
         $680 = $679 & 127;
         $681 = (($680) + -1)|0;
         $682 = (($x$i) + ($681<<2)|0);
         HEAP32[$682>>2] = 0;
         $z$7$1$i = $680;
        } else {
         $z$7$1$i = $z$7$i;
        }
        $683 = $619 * 1.0E+9;
        $684 = (($x$i) + ($621<<2)|0);
        $685 = HEAP32[$684>>2]|0;
        $686 = (+($685>>>0));
        $687 = $683 + $686;
        $643 = (+($sign$0|0));
        $625 = $643 * $687;
        $663 = (($e2$1$i246) + 53)|0;
        $669 = (($663) - ($emin$0$ph))|0;
        $670 = ($669|0)<($bits$0$ph|0);
        $688 = ($669|0)<(0);
        $$$i = $688 ? 0 : $669;
        $denormal$0$i = $670&1;
        $$010$i = $670 ? $$$i : $bits$0$ph;
        $689 = ($$010$i|0)<(53);
        if ($689) {
         $623 = (105 - ($$010$i))|0;
         $624 = (+_scalbn(1.0,$623));
         $626 = (+_copysignl($624,$625));
         $627 = (53 - ($$010$i))|0;
         $628 = (+_scalbn(1.0,$627));
         $629 = (+_fmodl($625,$628));
         $630 = $625 - $629;
         $631 = $626 + $630;
         $bias$0$i25 = $626;$frac$0$i = $629;$y$1$i24 = $631;
        } else {
         $bias$0$i25 = 0.0;$frac$0$i = 0.0;$y$1$i24 = $625;
        }
        $632 = (($a$3$i249) + 2)|0;
        $633 = $632 & 127;
        $634 = ($633|0)==($z$7$1$i|0);
        do {
         if ($634) {
          $frac$2$i = $frac$0$i;
         } else {
          $635 = (($x$i) + ($633<<2)|0);
          $636 = HEAP32[$635>>2]|0;
          $637 = ($636>>>0)<(500000000);
          do {
           if ($637) {
            $638 = ($636|0)==(0);
            if ($638) {
             $639 = (($a$3$i249) + 3)|0;
             $640 = $639 & 127;
             $641 = ($640|0)==($z$7$1$i|0);
             if ($641) {
              $frac$1$i = $frac$0$i;
              break;
             }
            }
            $642 = $643 * 0.25;
            $644 = $642 + $frac$0$i;
            $frac$1$i = $644;
           } else {
            $645 = ($636>>>0)>(500000000);
            if ($645) {
             $646 = $643 * 0.75;
             $647 = $646 + $frac$0$i;
             $frac$1$i = $647;
             break;
            }
            $648 = (($a$3$i249) + 3)|0;
            $649 = $648 & 127;
            $650 = ($649|0)==($z$7$1$i|0);
            if ($650) {
             $651 = $643 * 0.5;
             $652 = $651 + $frac$0$i;
             $frac$1$i = $652;
             break;
            } else {
             $653 = $643 * 0.75;
             $654 = $653 + $frac$0$i;
             $frac$1$i = $654;
             break;
            }
           }
          } while(0);
          $655 = (53 - ($$010$i))|0;
          $656 = ($655|0)>(1);
          if (!($656)) {
           $frac$2$i = $frac$1$i;
           break;
          }
          $657 = (+_fmodl($frac$1$i,1.0));
          $658 = $657 != 0.0;
          if ($658) {
           $frac$2$i = $frac$1$i;
           break;
          }
          $659 = $frac$1$i + 1.0;
          $frac$2$i = $659;
         }
        } while(0);
        $660 = $y$1$i24 + $frac$2$i;
        $661 = $660 - $bias$0$i25;
        $662 = $663 & 2147483647;
        $664 = (-2 - ($sum$i))|0;
        $665 = ($662|0)>($664|0);
        do {
         if ($665) {
          $666 = (+Math_abs((+$661)));
          $667 = !($666 >= 9007199254740992.0);
          if ($667) {
           $denormal$2$i = $denormal$0$i;$e2$2$i = $e2$1$i246;$y$2$i26 = $661;
          } else {
           $668 = ($$010$i|0)==($669|0);
           $or$cond20$i = $670 & $668;
           $denormal$1$i = $or$cond20$i ? 0 : $denormal$0$i;
           $671 = $661 * 0.5;
           $672 = (($e2$1$i246) + 1)|0;
           $denormal$2$i = $denormal$1$i;$e2$2$i = $672;$y$2$i26 = $671;
          }
          $673 = (($e2$2$i) + 50)|0;
          $674 = ($673|0)>($330|0);
          if (!($674)) {
           $675 = ($denormal$2$i|0)!=(0);
           $676 = $frac$2$i != 0.0;
           $or$cond8$i = $676 & $675;
           if (!($or$cond8$i)) {
            $e2$3$i = $e2$2$i;$y$3$i = $y$2$i26;
            break;
           }
          }
          $677 = (___errno_location()|0);
          HEAP32[$677>>2] = 34;
          $e2$3$i = $e2$2$i;$y$3$i = $y$2$i26;
         } else {
          $e2$3$i = $e2$1$i246;$y$3$i = $661;
         }
        } while(0);
        $678 = (+_scalbnl($y$3$i,$e2$3$i));
        $$0$i27 = $678;
       }
      } while(0);
      $$0 = $$0$i27;
      break L4;
      break;
     }
     default: {
      $109 = HEAP32[$1>>2]|0;
      $110 = ($109|0)==(0|0);
      if (!($110)) {
       $111 = HEAP32[$0>>2]|0;
       $112 = ((($111)) + -1|0);
       HEAP32[$0>>2] = $112;
      }
      $113 = (___errno_location()|0);
      HEAP32[$113>>2] = 22;
      ___shlim($f,0);
      $$0 = 0.0;
      break L4;
     }
     }
    }
    }
   } while(0);
   if ((label|0) == 23) {
    $41 = HEAP32[$1>>2]|0;
    $42 = ($41|0)==(0|0);
    if (!($42)) {
     $43 = HEAP32[$0>>2]|0;
     $44 = ((($43)) + -1|0);
     HEAP32[$0>>2] = $44;
    }
    $45 = ($pok|0)!=(0);
    $46 = ($i$0$lcssa>>>0)>(3);
    $or$cond9 = $45 & $46;
    if ($or$cond9) {
     $i$1 = $i$0$lcssa;
     while(1) {
      if (!($42)) {
       $47 = HEAP32[$0>>2]|0;
       $48 = ((($47)) + -1|0);
       HEAP32[$0>>2] = $48;
      }
      $49 = (($i$1) + -1)|0;
      $$old8 = ($49>>>0)>(3);
      if ($$old8) {
       $i$1 = $49;
      } else {
       break;
      }
     }
    }
   }
   $50 = (+($sign$0|0));
   $51 = $50 * inf;
   $52 = $51;
   $$0 = $52;
  }
 } while(0);
 STACKTOP = sp;return (+$$0);
}
function ___intscan($f,$base,$pok,$0,$1) {
 $f = $f|0;
 $base = $base|0;
 $pok = $pok|0;
 $0 = $0|0;
 $1 = $1|0;
 var $$1 = 0, $$122 = 0, $$123 = 0, $$base21 = 0, $$lcssa = 0, $$lcssa130 = 0, $$lcssa131 = 0, $$lcssa132 = 0, $$lcssa133 = 0, $$lcssa134 = 0, $$lcssa135 = 0, $$sum = 0, $$sum14 = 0, $$sum1445 = 0, $$sum15 = 0, $$sum16 = 0, $$sum17 = 0, $$sum18 = 0, $$sum1865 = 0, $$sum19 = 0;
 var $$sum20 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0;
 var $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0;
 var $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0;
 var $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0;
 var $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0;
 var $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0;
 var $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0;
 var $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0;
 var $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0;
 var $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0;
 var $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $3 = 0, $30 = 0;
 var $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0;
 var $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0;
 var $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0;
 var $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $c$0 = 0, $c$1 = 0, $c$124 = 0, $c$2$be = 0, $c$2$be$lcssa = 0;
 var $c$2$lcssa = 0, $c$3$be = 0, $c$3$lcssa = 0, $c$371 = 0, $c$4$be = 0, $c$4$be$lcssa = 0, $c$4$lcssa = 0, $c$5$be = 0, $c$6$be = 0, $c$6$be$lcssa = 0, $c$6$lcssa = 0, $c$7$be = 0, $c$753 = 0, $c$8 = 0, $c$9$be = 0, $neg$0 = 0, $neg$0$ = 0, $neg$1 = 0, $or$cond = 0, $or$cond12 = 0;
 var $or$cond40 = 0, $or$cond5 = 0, $or$cond7 = 0, $x$082 = 0, $x$146 = 0, $x$266 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ($base>>>0)>(36);
 L1: do {
  if ($2) {
   $5 = (___errno_location()|0);
   HEAP32[$5>>2] = 22;
   $286 = 0;$287 = 0;
  } else {
   $3 = ((($f)) + 4|0);
   $4 = ((($f)) + 100|0);
   while(1) {
    $6 = HEAP32[$3>>2]|0;
    $7 = HEAP32[$4>>2]|0;
    $8 = ($6>>>0)<($7>>>0);
    if ($8) {
     $9 = ((($6)) + 1|0);
     HEAP32[$3>>2] = $9;
     $10 = HEAP8[$6>>0]|0;
     $11 = $10&255;
     $13 = $11;
    } else {
     $12 = (___shgetc($f)|0);
     $13 = $12;
    }
    $14 = (_isspace($13)|0);
    $15 = ($14|0)==(0);
    if ($15) {
     $$lcssa135 = $13;
     break;
    }
   }
   $16 = ($$lcssa135|0)==(45);
   L11: do {
    switch ($$lcssa135|0) {
    case 43: case 45:  {
     $17 = $16 << 31 >> 31;
     $18 = HEAP32[$3>>2]|0;
     $19 = HEAP32[$4>>2]|0;
     $20 = ($18>>>0)<($19>>>0);
     if ($20) {
      $21 = ((($18)) + 1|0);
      HEAP32[$3>>2] = $21;
      $22 = HEAP8[$18>>0]|0;
      $23 = $22&255;
      $c$0 = $23;$neg$0 = $17;
      break L11;
     } else {
      $24 = (___shgetc($f)|0);
      $c$0 = $24;$neg$0 = $17;
      break L11;
     }
     break;
    }
    default: {
     $c$0 = $$lcssa135;$neg$0 = 0;
    }
    }
   } while(0);
   $25 = ($base|0)==(0);
   $26 = $base & -17;
   $27 = ($26|0)==(0);
   $28 = ($c$0|0)==(48);
   $or$cond5 = $27 & $28;
   do {
    if ($or$cond5) {
     $29 = HEAP32[$3>>2]|0;
     $30 = HEAP32[$4>>2]|0;
     $31 = ($29>>>0)<($30>>>0);
     if ($31) {
      $32 = ((($29)) + 1|0);
      HEAP32[$3>>2] = $32;
      $33 = HEAP8[$29>>0]|0;
      $34 = $33&255;
      $37 = $34;
     } else {
      $35 = (___shgetc($f)|0);
      $37 = $35;
     }
     $36 = $37 | 32;
     $38 = ($36|0)==(120);
     if (!($38)) {
      if ($25) {
       $$123 = 8;$c$124 = $37;
       label = 46;
       break;
      } else {
       $$1 = $base;$c$1 = $37;
       label = 32;
       break;
      }
     }
     $39 = HEAP32[$3>>2]|0;
     $40 = HEAP32[$4>>2]|0;
     $41 = ($39>>>0)<($40>>>0);
     if ($41) {
      $42 = ((($39)) + 1|0);
      HEAP32[$3>>2] = $42;
      $43 = HEAP8[$39>>0]|0;
      $44 = $43&255;
      $46 = $44;
     } else {
      $45 = (___shgetc($f)|0);
      $46 = $45;
     }
     $$sum20 = (($46) + 1)|0;
     $47 = (65665 + ($$sum20)|0);
     $48 = HEAP8[$47>>0]|0;
     $49 = ($48&255)>(15);
     if ($49) {
      $50 = HEAP32[$4>>2]|0;
      $51 = ($50|0)==(0|0);
      if (!($51)) {
       $52 = HEAP32[$3>>2]|0;
       $53 = ((($52)) + -1|0);
       HEAP32[$3>>2] = $53;
      }
      $54 = ($pok|0)==(0);
      if ($54) {
       ___shlim($f,0);
       $286 = 0;$287 = 0;
       break L1;
      }
      if ($51) {
       $286 = 0;$287 = 0;
       break L1;
      }
      $55 = HEAP32[$3>>2]|0;
      $56 = ((($55)) + -1|0);
      HEAP32[$3>>2] = $56;
      $286 = 0;$287 = 0;
      break L1;
     } else {
      $$123 = 16;$c$124 = $46;
      label = 46;
     }
    } else {
     $$base21 = $25 ? 10 : $base;
     $$sum = (($c$0) + 1)|0;
     $57 = (65665 + ($$sum)|0);
     $58 = HEAP8[$57>>0]|0;
     $59 = $58&255;
     $60 = ($59>>>0)<($$base21>>>0);
     if ($60) {
      $$1 = $$base21;$c$1 = $c$0;
      label = 32;
     } else {
      $61 = HEAP32[$4>>2]|0;
      $62 = ($61|0)==(0|0);
      if (!($62)) {
       $63 = HEAP32[$3>>2]|0;
       $64 = ((($63)) + -1|0);
       HEAP32[$3>>2] = $64;
      }
      ___shlim($f,0);
      $65 = (___errno_location()|0);
      HEAP32[$65>>2] = 22;
      $286 = 0;$287 = 0;
      break L1;
     }
    }
   } while(0);
   if ((label|0) == 32) {
    $66 = ($$1|0)==(10);
    if ($66) {
     $67 = (($c$1) + -48)|0;
     $68 = ($67>>>0)<(10);
     if ($68) {
      $71 = $67;$x$082 = 0;
      while(1) {
       $69 = ($x$082*10)|0;
       $70 = (($69) + ($71))|0;
       $72 = HEAP32[$3>>2]|0;
       $73 = HEAP32[$4>>2]|0;
       $74 = ($72>>>0)<($73>>>0);
       if ($74) {
        $75 = ((($72)) + 1|0);
        HEAP32[$3>>2] = $75;
        $76 = HEAP8[$72>>0]|0;
        $77 = $76&255;
        $c$2$be = $77;
       } else {
        $78 = (___shgetc($f)|0);
        $c$2$be = $78;
       }
       $79 = (($c$2$be) + -48)|0;
       $80 = ($79>>>0)<(10);
       $81 = ($70>>>0)<(429496729);
       $82 = $80 & $81;
       if ($82) {
        $71 = $79;$x$082 = $70;
       } else {
        $$lcssa134 = $70;$c$2$be$lcssa = $c$2$be;
        break;
       }
      }
      $288 = $$lcssa134;$289 = 0;$c$2$lcssa = $c$2$be$lcssa;
     } else {
      $288 = 0;$289 = 0;$c$2$lcssa = $c$1;
     }
     $83 = (($c$2$lcssa) + -48)|0;
     $84 = ($83>>>0)<(10);
     if ($84) {
      $85 = $288;$86 = $289;$89 = $83;$c$371 = $c$2$lcssa;
      while(1) {
       $87 = (___muldi3(($85|0),($86|0),10,0)|0);
       $88 = tempRet0;
       $90 = ($89|0)<(0);
       $91 = $90 << 31 >> 31;
       $92 = $89 ^ -1;
       $93 = $91 ^ -1;
       $94 = ($88>>>0)>($93>>>0);
       $95 = ($87>>>0)>($92>>>0);
       $96 = ($88|0)==($93|0);
       $97 = $96 & $95;
       $98 = $94 | $97;
       if ($98) {
        $$lcssa = $89;$290 = $85;$291 = $86;$c$3$lcssa = $c$371;
        break;
       }
       $99 = (_i64Add(($87|0),($88|0),($89|0),($91|0))|0);
       $100 = tempRet0;
       $101 = HEAP32[$3>>2]|0;
       $102 = HEAP32[$4>>2]|0;
       $103 = ($101>>>0)<($102>>>0);
       if ($103) {
        $104 = ((($101)) + 1|0);
        HEAP32[$3>>2] = $104;
        $105 = HEAP8[$101>>0]|0;
        $106 = $105&255;
        $c$3$be = $106;
       } else {
        $107 = (___shgetc($f)|0);
        $c$3$be = $107;
       }
       $108 = (($c$3$be) + -48)|0;
       $109 = ($108>>>0)<(10);
       $110 = ($100>>>0)<(429496729);
       $111 = ($99>>>0)<(2576980378);
       $112 = ($100|0)==(429496729);
       $113 = $112 & $111;
       $114 = $110 | $113;
       $or$cond7 = $109 & $114;
       if ($or$cond7) {
        $85 = $99;$86 = $100;$89 = $108;$c$371 = $c$3$be;
       } else {
        $$lcssa = $108;$290 = $99;$291 = $100;$c$3$lcssa = $c$3$be;
        break;
       }
      }
      $115 = ($$lcssa>>>0)>(9);
      if ($115) {
       $259 = $291;$261 = $290;$neg$1 = $neg$0;
      } else {
       $$122 = 10;$292 = $290;$293 = $291;$c$8 = $c$3$lcssa;
       label = 72;
      }
     } else {
      $259 = $289;$261 = $288;$neg$1 = $neg$0;
     }
    } else {
     $$123 = $$1;$c$124 = $c$1;
     label = 46;
    }
   }
   L63: do {
    if ((label|0) == 46) {
     $116 = (($$123) + -1)|0;
     $117 = $116 & $$123;
     $118 = ($117|0)==(0);
     if ($118) {
      $123 = ($$123*23)|0;
      $124 = $123 >>> 5;
      $125 = $124 & 7;
      $126 = (65922 + ($125)|0);
      $127 = HEAP8[$126>>0]|0;
      $128 = $127 << 24 >> 24;
      $$sum1445 = (($c$124) + 1)|0;
      $129 = (65665 + ($$sum1445)|0);
      $130 = HEAP8[$129>>0]|0;
      $131 = $130&255;
      $132 = ($131>>>0)<($$123>>>0);
      if ($132) {
       $135 = $131;$x$146 = 0;
       while(1) {
        $133 = $x$146 << $128;
        $134 = $135 | $133;
        $136 = HEAP32[$3>>2]|0;
        $137 = HEAP32[$4>>2]|0;
        $138 = ($136>>>0)<($137>>>0);
        if ($138) {
         $139 = ((($136)) + 1|0);
         HEAP32[$3>>2] = $139;
         $140 = HEAP8[$136>>0]|0;
         $141 = $140&255;
         $c$4$be = $141;
        } else {
         $142 = (___shgetc($f)|0);
         $c$4$be = $142;
        }
        $$sum14 = (($c$4$be) + 1)|0;
        $143 = (65665 + ($$sum14)|0);
        $144 = HEAP8[$143>>0]|0;
        $145 = $144&255;
        $146 = ($145>>>0)<($$123>>>0);
        $147 = ($134>>>0)<(134217728);
        $148 = $147 & $146;
        if ($148) {
         $135 = $145;$x$146 = $134;
        } else {
         $$lcssa130 = $134;$$lcssa131 = $144;$c$4$be$lcssa = $c$4$be;
         break;
        }
       }
       $152 = $$lcssa131;$154 = 0;$156 = $$lcssa130;$c$4$lcssa = $c$4$be$lcssa;
      } else {
       $152 = $130;$154 = 0;$156 = 0;$c$4$lcssa = $c$124;
      }
      $149 = (_bitshift64Lshr(-1,-1,($128|0))|0);
      $150 = tempRet0;
      $151 = $152&255;
      $153 = ($151>>>0)>=($$123>>>0);
      $155 = ($154>>>0)>($150>>>0);
      $157 = ($156>>>0)>($149>>>0);
      $158 = ($154|0)==($150|0);
      $159 = $158 & $157;
      $160 = $155 | $159;
      $or$cond40 = $153 | $160;
      if ($or$cond40) {
       $$122 = $$123;$292 = $156;$293 = $154;$c$8 = $c$4$lcssa;
       label = 72;
       break;
      } else {
       $161 = $156;$162 = $154;$166 = $152;
      }
      while(1) {
       $163 = (_bitshift64Shl(($161|0),($162|0),($128|0))|0);
       $164 = tempRet0;
       $165 = $166&255;
       $167 = $165 | $163;
       $168 = HEAP32[$3>>2]|0;
       $169 = HEAP32[$4>>2]|0;
       $170 = ($168>>>0)<($169>>>0);
       if ($170) {
        $171 = ((($168)) + 1|0);
        HEAP32[$3>>2] = $171;
        $172 = HEAP8[$168>>0]|0;
        $173 = $172&255;
        $c$5$be = $173;
       } else {
        $174 = (___shgetc($f)|0);
        $c$5$be = $174;
       }
       $$sum15 = (($c$5$be) + 1)|0;
       $175 = (65665 + ($$sum15)|0);
       $176 = HEAP8[$175>>0]|0;
       $177 = $176&255;
       $178 = ($177>>>0)>=($$123>>>0);
       $179 = ($164>>>0)>($150>>>0);
       $180 = ($167>>>0)>($149>>>0);
       $181 = ($164|0)==($150|0);
       $182 = $181 & $180;
       $183 = $179 | $182;
       $or$cond = $178 | $183;
       if ($or$cond) {
        $$122 = $$123;$292 = $167;$293 = $164;$c$8 = $c$5$be;
        label = 72;
        break L63;
       } else {
        $161 = $167;$162 = $164;$166 = $176;
       }
      }
     }
     $$sum1865 = (($c$124) + 1)|0;
     $119 = (65665 + ($$sum1865)|0);
     $120 = HEAP8[$119>>0]|0;
     $121 = $120&255;
     $122 = ($121>>>0)<($$123>>>0);
     if ($122) {
      $186 = $121;$x$266 = 0;
      while(1) {
       $184 = Math_imul($x$266, $$123)|0;
       $185 = (($186) + ($184))|0;
       $187 = HEAP32[$3>>2]|0;
       $188 = HEAP32[$4>>2]|0;
       $189 = ($187>>>0)<($188>>>0);
       if ($189) {
        $190 = ((($187)) + 1|0);
        HEAP32[$3>>2] = $190;
        $191 = HEAP8[$187>>0]|0;
        $192 = $191&255;
        $c$6$be = $192;
       } else {
        $193 = (___shgetc($f)|0);
        $c$6$be = $193;
       }
       $$sum18 = (($c$6$be) + 1)|0;
       $194 = (65665 + ($$sum18)|0);
       $195 = HEAP8[$194>>0]|0;
       $196 = $195&255;
       $197 = ($196>>>0)<($$123>>>0);
       $198 = ($185>>>0)<(119304647);
       $199 = $198 & $197;
       if ($199) {
        $186 = $196;$x$266 = $185;
       } else {
        $$lcssa132 = $185;$$lcssa133 = $195;$c$6$be$lcssa = $c$6$be;
        break;
       }
      }
      $201 = $$lcssa133;$294 = $$lcssa132;$295 = 0;$c$6$lcssa = $c$6$be$lcssa;
     } else {
      $201 = $120;$294 = 0;$295 = 0;$c$6$lcssa = $c$124;
     }
     $200 = $201&255;
     $202 = ($200>>>0)<($$123>>>0);
     if ($202) {
      $203 = (___udivdi3(-1,-1,($$123|0),0)|0);
      $204 = tempRet0;
      $205 = $295;$207 = $294;$215 = $201;$c$753 = $c$6$lcssa;
      while(1) {
       $206 = ($205>>>0)>($204>>>0);
       $208 = ($207>>>0)>($203>>>0);
       $209 = ($205|0)==($204|0);
       $210 = $209 & $208;
       $211 = $206 | $210;
       if ($211) {
        $$122 = $$123;$292 = $207;$293 = $205;$c$8 = $c$753;
        label = 72;
        break L63;
       }
       $212 = (___muldi3(($207|0),($205|0),($$123|0),0)|0);
       $213 = tempRet0;
       $214 = $215&255;
       $216 = $214 ^ -1;
       $217 = ($213>>>0)>(4294967295);
       $218 = ($212>>>0)>($216>>>0);
       $219 = ($213|0)==(-1);
       $220 = $219 & $218;
       $221 = $217 | $220;
       if ($221) {
        $$122 = $$123;$292 = $207;$293 = $205;$c$8 = $c$753;
        label = 72;
        break L63;
       }
       $222 = (_i64Add(($214|0),0,($212|0),($213|0))|0);
       $223 = tempRet0;
       $224 = HEAP32[$3>>2]|0;
       $225 = HEAP32[$4>>2]|0;
       $226 = ($224>>>0)<($225>>>0);
       if ($226) {
        $227 = ((($224)) + 1|0);
        HEAP32[$3>>2] = $227;
        $228 = HEAP8[$224>>0]|0;
        $229 = $228&255;
        $c$7$be = $229;
       } else {
        $230 = (___shgetc($f)|0);
        $c$7$be = $230;
       }
       $$sum19 = (($c$7$be) + 1)|0;
       $231 = (65665 + ($$sum19)|0);
       $232 = HEAP8[$231>>0]|0;
       $233 = $232&255;
       $234 = ($233>>>0)<($$123>>>0);
       if ($234) {
        $205 = $223;$207 = $222;$215 = $232;$c$753 = $c$7$be;
       } else {
        $$122 = $$123;$292 = $222;$293 = $223;$c$8 = $c$7$be;
        label = 72;
        break;
       }
      }
     } else {
      $$122 = $$123;$292 = $294;$293 = $295;$c$8 = $c$6$lcssa;
      label = 72;
     }
    }
   } while(0);
   if ((label|0) == 72) {
    $$sum16 = (($c$8) + 1)|0;
    $235 = (65665 + ($$sum16)|0);
    $236 = HEAP8[$235>>0]|0;
    $237 = $236&255;
    $238 = ($237>>>0)<($$122>>>0);
    if ($238) {
     while(1) {
      $239 = HEAP32[$3>>2]|0;
      $240 = HEAP32[$4>>2]|0;
      $241 = ($239>>>0)<($240>>>0);
      if ($241) {
       $242 = ((($239)) + 1|0);
       HEAP32[$3>>2] = $242;
       $243 = HEAP8[$239>>0]|0;
       $244 = $243&255;
       $c$9$be = $244;
      } else {
       $245 = (___shgetc($f)|0);
       $c$9$be = $245;
      }
      $$sum17 = (($c$9$be) + 1)|0;
      $246 = (65665 + ($$sum17)|0);
      $247 = HEAP8[$246>>0]|0;
      $248 = $247&255;
      $249 = ($248>>>0)<($$122>>>0);
      if (!($249)) {
       break;
      }
     }
     $250 = (___errno_location()|0);
     HEAP32[$250>>2] = 34;
     $251 = $0 & 1;
     $252 = ($251|0)==(0);
     $253 = (0)==(0);
     $254 = $252 & $253;
     $neg$0$ = $254 ? $neg$0 : 0;
     $259 = $1;$261 = $0;$neg$1 = $neg$0$;
    } else {
     $259 = $293;$261 = $292;$neg$1 = $neg$0;
    }
   }
   $255 = HEAP32[$4>>2]|0;
   $256 = ($255|0)==(0|0);
   if (!($256)) {
    $257 = HEAP32[$3>>2]|0;
    $258 = ((($257)) + -1|0);
    HEAP32[$3>>2] = $258;
   }
   $260 = ($259>>>0)<($1>>>0);
   $262 = ($261>>>0)<($0>>>0);
   $263 = ($259|0)==($1|0);
   $264 = $263 & $262;
   $265 = $260 | $264;
   if (!($265)) {
    $266 = $0 & 1;
    $267 = ($266|0)!=(0);
    $268 = (0)!=(0);
    $269 = $267 | $268;
    $270 = ($neg$1|0)!=(0);
    $or$cond12 = $269 | $270;
    if (!($or$cond12)) {
     $271 = (___errno_location()|0);
     HEAP32[$271>>2] = 34;
     $272 = (_i64Add(($0|0),($1|0),-1,-1)|0);
     $273 = tempRet0;
     $286 = $273;$287 = $272;
     break;
    }
    $274 = ($259>>>0)>($1>>>0);
    $275 = ($261>>>0)>($0>>>0);
    $276 = ($259|0)==($1|0);
    $277 = $276 & $275;
    $278 = $274 | $277;
    if ($278) {
     $279 = (___errno_location()|0);
     HEAP32[$279>>2] = 34;
     $286 = $1;$287 = $0;
     break;
    }
   }
   $280 = ($neg$1|0)<(0);
   $281 = $280 << 31 >> 31;
   $282 = $261 ^ $neg$1;
   $283 = $259 ^ $281;
   $284 = (_i64Subtract(($282|0),($283|0),($neg$1|0),($281|0))|0);
   $285 = tempRet0;
   $286 = $285;$287 = $284;
  }
 } while(0);
 tempRet0 = ($286);
 return ($287|0);
}
function ___shlim($f,$lim) {
 $f = $f|0;
 $lim = $lim|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 104|0);
 HEAP32[$0>>2] = $lim;
 $1 = ((($f)) + 8|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($f)) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = $2;
 $6 = $4;
 $7 = (($5) - ($6))|0;
 $8 = ((($f)) + 108|0);
 HEAP32[$8>>2] = $7;
 $9 = ($lim|0)!=(0);
 $10 = ($7|0)>($lim|0);
 $or$cond = $9 & $10;
 if ($or$cond) {
  $11 = (($4) + ($lim)|0);
  $12 = ((($f)) + 100|0);
  HEAP32[$12>>2] = $11;
 } else {
  $13 = ((($f)) + 100|0);
  HEAP32[$13>>2] = $5;
 }
 return;
}
function ___shgetc($f) {
 $f = $f|0;
 var $$0 = 0, $$phi$trans$insert = 0, $$phi$trans$insert3 = 0, $$pre = 0, $$pre4 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0;
 var $40 = 0, $41 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 104|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0);
 if ($2) {
  label = 3;
 } else {
  $3 = ((($f)) + 108|0);
  $4 = HEAP32[$3>>2]|0;
  $5 = ($4|0)<($1|0);
  if ($5) {
   label = 3;
  } else {
   label = 4;
  }
 }
 if ((label|0) == 3) {
  $6 = (___uflow($f)|0);
  $7 = ($6|0)<(0);
  if ($7) {
   label = 4;
  } else {
   $9 = HEAP32[$0>>2]|0;
   $10 = ($9|0)==(0);
   $$phi$trans$insert = ((($f)) + 8|0);
   if ($10) {
    $$pre = HEAP32[$$phi$trans$insert>>2]|0;
    $11 = $$pre;
    $26 = $$pre;$41 = $11;
    label = 9;
   } else {
    $12 = HEAP32[$$phi$trans$insert>>2]|0;
    $13 = ((($f)) + 4|0);
    $14 = HEAP32[$13>>2]|0;
    $15 = $12;
    $16 = $14;
    $17 = (($15) - ($16))|0;
    $18 = ((($f)) + 108|0);
    $19 = HEAP32[$18>>2]|0;
    $20 = (($9) - ($19))|0;
    $21 = (($20) + -1)|0;
    $22 = ($17|0)>($21|0);
    if ($22) {
     $23 = (($14) + ($21)|0);
     $24 = ((($f)) + 100|0);
     HEAP32[$24>>2] = $23;
     $27 = $12;
    } else {
     $26 = $15;$41 = $12;
     label = 9;
    }
   }
   if ((label|0) == 9) {
    $25 = ((($f)) + 100|0);
    HEAP32[$25>>2] = $26;
    $27 = $41;
   }
   $28 = ($27|0)==(0|0);
   $$phi$trans$insert3 = ((($f)) + 4|0);
   $$pre4 = HEAP32[$$phi$trans$insert3>>2]|0;
   if (!($28)) {
    $29 = $27;
    $30 = $$pre4;
    $31 = ((($f)) + 108|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = (($29) + 1)|0;
    $34 = (($33) - ($30))|0;
    $35 = (($34) + ($32))|0;
    HEAP32[$31>>2] = $35;
   }
   $36 = ((($$pre4)) + -1|0);
   $37 = HEAP8[$36>>0]|0;
   $38 = $37&255;
   $39 = ($38|0)==($6|0);
   if ($39) {
    $$0 = $6;
   } else {
    $40 = $6&255;
    HEAP8[$36>>0] = $40;
    $$0 = $6;
   }
  }
 }
 if ((label|0) == 4) {
  $8 = ((($f)) + 100|0);
  HEAP32[$8>>2] = 0;
  $$0 = -1;
 }
 return ($$0|0);
}
function ___syscall_ret($r) {
 $r = $r|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($r>>>0)>(4294963200);
 if ($0) {
  $1 = (0 - ($r))|0;
  $2 = (___errno_location()|0);
  HEAP32[$2>>2] = $1;
  $$0 = -1;
 } else {
  $$0 = $r;
 }
 return ($$0|0);
}
function _copysign($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 HEAPF64[tempDoublePtr>>3] = $y;$2 = HEAP32[tempDoublePtr>>2]|0;
 $3 = HEAP32[tempDoublePtr+4>>2]|0;
 $4 = $1 & 2147483647;
 $5 = $3 & -2147483648;
 $6 = $5 | $4;
 HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $6;$7 = +HEAPF64[tempDoublePtr>>3];
 return (+$7);
}
function _copysignl($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_copysign($x,$y));
 return (+$0);
}
function _fmod($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $$lcssa7 = 0, $$x = 0.0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0;
 var $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0.0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0;
 var $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0;
 var $15 = 0, $150 = 0.0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0.0, $24 = 0.0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0.0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0.0;
 var $ex$0$lcssa = 0, $ex$026 = 0, $ex$1 = 0, $ex$2$lcssa = 0, $ex$212 = 0, $ex$3$lcssa = 0, $ex$39 = 0, $ey$0$lcssa = 0, $ey$020 = 0, $ey$1$ph = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 HEAPF64[tempDoublePtr>>3] = $y;$2 = HEAP32[tempDoublePtr>>2]|0;
 $3 = HEAP32[tempDoublePtr+4>>2]|0;
 $4 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $5 = tempRet0;
 $6 = $4 & 2047;
 $7 = (_bitshift64Lshr(($2|0),($3|0),52)|0);
 $8 = tempRet0;
 $9 = $7 & 2047;
 $10 = $1 & -2147483648;
 $11 = (_bitshift64Shl(($2|0),($3|0),1)|0);
 $12 = tempRet0;
 $13 = ($11|0)==(0);
 $14 = ($12|0)==(0);
 $15 = $13 & $14;
 L1: do {
  if ($15) {
   label = 3;
  } else {
   $16 = $3 & 2147483647;
   $17 = ($16>>>0)>(2146435072);
   $18 = ($2>>>0)>(0);
   $19 = ($16|0)==(2146435072);
   $20 = $19 & $18;
   $21 = $17 | $20;
   $22 = ($6|0)==(2047);
   $or$cond = $21 | $22;
   if ($or$cond) {
    label = 3;
   } else {
    $25 = (_bitshift64Shl(($0|0),($1|0),1)|0);
    $26 = tempRet0;
    $27 = ($26>>>0)>($12>>>0);
    $28 = ($25>>>0)>($11>>>0);
    $29 = ($26|0)==($12|0);
    $30 = $29 & $28;
    $31 = $27 | $30;
    if (!($31)) {
     $32 = ($25|0)==($11|0);
     $33 = ($26|0)==($12|0);
     $34 = $32 & $33;
     $35 = $x * 0.0;
     $$x = $34 ? $35 : $x;
     return (+$$x);
    }
    $36 = ($6|0)==(0);
    if ($36) {
     $37 = (_bitshift64Shl(($0|0),($1|0),12)|0);
     $38 = tempRet0;
     $39 = ($38|0)>(-1);
     $40 = ($37>>>0)>(4294967295);
     $41 = ($38|0)==(-1);
     $42 = $41 & $40;
     $43 = $39 | $42;
     if ($43) {
      $45 = $37;$46 = $38;$ex$026 = 0;
      while(1) {
       $44 = (($ex$026) + -1)|0;
       $47 = (_bitshift64Shl(($45|0),($46|0),1)|0);
       $48 = tempRet0;
       $49 = ($48|0)>(-1);
       $50 = ($47>>>0)>(4294967295);
       $51 = ($48|0)==(-1);
       $52 = $51 & $50;
       $53 = $49 | $52;
       if ($53) {
        $45 = $47;$46 = $48;$ex$026 = $44;
       } else {
        $ex$0$lcssa = $44;
        break;
       }
      }
     } else {
      $ex$0$lcssa = 0;
     }
     $54 = (1 - ($ex$0$lcssa))|0;
     $55 = (_bitshift64Shl(($0|0),($1|0),($54|0))|0);
     $56 = tempRet0;
     $83 = $55;$84 = $56;$ex$1 = $ex$0$lcssa;
    } else {
     $57 = $1 & 1048575;
     $58 = $57 | 1048576;
     $83 = $0;$84 = $58;$ex$1 = $6;
    }
    $59 = ($9|0)==(0);
    if ($59) {
     $60 = (_bitshift64Shl(($2|0),($3|0),12)|0);
     $61 = tempRet0;
     $62 = ($61|0)>(-1);
     $63 = ($60>>>0)>(4294967295);
     $64 = ($61|0)==(-1);
     $65 = $64 & $63;
     $66 = $62 | $65;
     if ($66) {
      $68 = $60;$69 = $61;$ey$020 = 0;
      while(1) {
       $67 = (($ey$020) + -1)|0;
       $70 = (_bitshift64Shl(($68|0),($69|0),1)|0);
       $71 = tempRet0;
       $72 = ($71|0)>(-1);
       $73 = ($70>>>0)>(4294967295);
       $74 = ($71|0)==(-1);
       $75 = $74 & $73;
       $76 = $72 | $75;
       if ($76) {
        $68 = $70;$69 = $71;$ey$020 = $67;
       } else {
        $ey$0$lcssa = $67;
        break;
       }
      }
     } else {
      $ey$0$lcssa = 0;
     }
     $77 = (1 - ($ey$0$lcssa))|0;
     $78 = (_bitshift64Shl(($2|0),($3|0),($77|0))|0);
     $79 = tempRet0;
     $85 = $78;$86 = $79;$ey$1$ph = $ey$0$lcssa;
    } else {
     $80 = $3 & 1048575;
     $81 = $80 | 1048576;
     $85 = $2;$86 = $81;$ey$1$ph = $9;
    }
    $82 = ($ex$1|0)>($ey$1$ph|0);
    $87 = (_i64Subtract(($83|0),($84|0),($85|0),($86|0))|0);
    $88 = tempRet0;
    $89 = ($88|0)>(-1);
    $90 = ($87>>>0)>(4294967295);
    $91 = ($88|0)==(-1);
    $92 = $91 & $90;
    $93 = $89 | $92;
    L23: do {
     if ($82) {
      $152 = $93;$153 = $87;$154 = $88;$94 = $83;$96 = $84;$ex$212 = $ex$1;
      while(1) {
       if ($152) {
        $95 = ($94|0)==($85|0);
        $97 = ($96|0)==($86|0);
        $98 = $95 & $97;
        if ($98) {
         break;
        } else {
         $100 = $153;$101 = $154;
        }
       } else {
        $100 = $94;$101 = $96;
       }
       $102 = (_bitshift64Shl(($100|0),($101|0),1)|0);
       $103 = tempRet0;
       $104 = (($ex$212) + -1)|0;
       $105 = ($104|0)>($ey$1$ph|0);
       $106 = (_i64Subtract(($102|0),($103|0),($85|0),($86|0))|0);
       $107 = tempRet0;
       $108 = ($107|0)>(-1);
       $109 = ($106>>>0)>(4294967295);
       $110 = ($107|0)==(-1);
       $111 = $110 & $109;
       $112 = $108 | $111;
       if ($105) {
        $152 = $112;$153 = $106;$154 = $107;$94 = $102;$96 = $103;$ex$212 = $104;
       } else {
        $$lcssa7 = $112;$113 = $102;$115 = $103;$155 = $106;$156 = $107;$ex$2$lcssa = $104;
        break L23;
       }
      }
      $99 = $x * 0.0;
      $$0 = $99;
      break L1;
     } else {
      $$lcssa7 = $93;$113 = $83;$115 = $84;$155 = $87;$156 = $88;$ex$2$lcssa = $ex$1;
     }
    } while(0);
    if ($$lcssa7) {
     $114 = ($113|0)==($85|0);
     $116 = ($115|0)==($86|0);
     $117 = $114 & $116;
     if ($117) {
      $125 = $x * 0.0;
      $$0 = $125;
      break;
     } else {
      $118 = $156;$120 = $155;
     }
    } else {
     $118 = $115;$120 = $113;
    }
    $119 = ($118>>>0)<(1048576);
    $121 = ($120>>>0)<(0);
    $122 = ($118|0)==(1048576);
    $123 = $122 & $121;
    $124 = $119 | $123;
    if ($124) {
     $126 = $120;$127 = $118;$ex$39 = $ex$2$lcssa;
     while(1) {
      $128 = (_bitshift64Shl(($126|0),($127|0),1)|0);
      $129 = tempRet0;
      $130 = (($ex$39) + -1)|0;
      $131 = ($129>>>0)<(1048576);
      $132 = ($128>>>0)<(0);
      $133 = ($129|0)==(1048576);
      $134 = $133 & $132;
      $135 = $131 | $134;
      if ($135) {
       $126 = $128;$127 = $129;$ex$39 = $130;
      } else {
       $137 = $128;$138 = $129;$ex$3$lcssa = $130;
       break;
      }
     }
    } else {
     $137 = $120;$138 = $118;$ex$3$lcssa = $ex$2$lcssa;
    }
    $136 = ($ex$3$lcssa|0)>(0);
    if ($136) {
     $139 = (_i64Add(($137|0),($138|0),0,-1048576)|0);
     $140 = tempRet0;
     $141 = (_bitshift64Shl(($ex$3$lcssa|0),0,52)|0);
     $142 = tempRet0;
     $143 = $139 | $141;
     $144 = $140 | $142;
     $149 = $144;$151 = $143;
    } else {
     $145 = (1 - ($ex$3$lcssa))|0;
     $146 = (_bitshift64Lshr(($137|0),($138|0),($145|0))|0);
     $147 = tempRet0;
     $149 = $147;$151 = $146;
    }
    $148 = $149 | $10;
    HEAP32[tempDoublePtr>>2] = $151;HEAP32[tempDoublePtr+4>>2] = $148;$150 = +HEAPF64[tempDoublePtr>>3];
    $$0 = $150;
   }
  }
 } while(0);
 if ((label|0) == 3) {
  $23 = $x * $y;
  $24 = $23 / $23;
  $$0 = $24;
 }
 return (+$$0);
}
function _fmodl($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_fmod($x,$y));
 return (+$0);
}
function _frexp($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $$0 = 0.0, $$01 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, $storemerge = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $3 = tempRet0;
 $4 = $2 & 2047;
 switch ($4|0) {
 case 0:  {
  $5 = $x != 0.0;
  if ($5) {
   $6 = $x * 1.8446744073709552E+19;
   $7 = (+_frexp($6,$e));
   $8 = HEAP32[$e>>2]|0;
   $9 = (($8) + -64)|0;
   $$01 = $7;$storemerge = $9;
  } else {
   $$01 = $x;$storemerge = 0;
  }
  HEAP32[$e>>2] = $storemerge;
  $$0 = $$01;
  break;
 }
 case 2047:  {
  $$0 = $x;
  break;
 }
 default: {
  $10 = (($4) + -1022)|0;
  HEAP32[$e>>2] = $10;
  $11 = $1 & -2146435073;
  $12 = $11 | 1071644672;
  HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $12;$13 = +HEAPF64[tempDoublePtr>>3];
  $$0 = $13;
 }
 }
 return (+$$0);
}
function _frexpl($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_frexp($x,$e));
 return (+$0);
}
function _scalbn($x,$n) {
 $x = +$x;
 $n = $n|0;
 var $$ = 0, $$0 = 0, $$1 = 0, $0 = 0, $1 = 0.0, $10 = 0, $11 = 0.0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0.0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0.0, $9 = 0, $y$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n|0)>(1023);
 if ($0) {
  $1 = $x * 8.9884656743115795E+307;
  $2 = (($n) + -1023)|0;
  $3 = ($2|0)>(1023);
  if ($3) {
   $4 = $1 * 8.9884656743115795E+307;
   $5 = (($n) + -2046)|0;
   $6 = ($5|0)>(1023);
   $$ = $6 ? 1023 : $5;
   $$0 = $$;$y$0 = $4;
  } else {
   $$0 = $2;$y$0 = $1;
  }
 } else {
  $7 = ($n|0)<(-1022);
  if ($7) {
   $8 = $x * 2.2250738585072014E-308;
   $9 = (($n) + 1022)|0;
   $10 = ($9|0)<(-1022);
   if ($10) {
    $11 = $8 * 2.2250738585072014E-308;
    $12 = (($n) + 2044)|0;
    $13 = ($12|0)<(-1022);
    $$1 = $13 ? -1022 : $12;
    $$0 = $$1;$y$0 = $11;
   } else {
    $$0 = $9;$y$0 = $8;
   }
  } else {
   $$0 = $n;$y$0 = $x;
  }
 }
 $14 = (($$0) + 1023)|0;
 $15 = (_bitshift64Shl(($14|0),0,52)|0);
 $16 = tempRet0;
 HEAP32[tempDoublePtr>>2] = $15;HEAP32[tempDoublePtr+4>>2] = $16;$17 = +HEAPF64[tempDoublePtr>>3];
 $18 = $y$0 * $17;
 return (+$18);
}
function _scalbnl($x,$n) {
 $x = +$x;
 $n = $n|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_scalbn($x,$n));
 return (+$0);
}
function _mbrtowc($wc,$src,$n,$st) {
 $wc = $wc|0;
 $src = $src|0;
 $n = $n|0;
 $st = $st|0;
 var $$0 = 0, $$024 = 0, $$1 = 0, $$lcssa = 0, $$lcssa35 = 0, $$st = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0;
 var $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0;
 var $4 = 0, $40 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $c$05 = 0, $c$1 = 0, $c$2 = 0, $dummy = 0, $dummy$wc = 0, $s$06 = 0, $s$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $dummy = sp;
 $0 = ($st|0)==(0|0);
 $$st = $0 ? 57012 : $st;
 $1 = HEAP32[$$st>>2]|0;
 $2 = ($src|0)==(0|0);
 L1: do {
  if ($2) {
   $3 = ($1|0)==(0);
   if ($3) {
    $$0 = 0;
   } else {
    label = 15;
   }
  } else {
   $4 = ($wc|0)==(0|0);
   $dummy$wc = $4 ? $dummy : $wc;
   $5 = ($n|0)==(0);
   if ($5) {
    $$0 = -2;
   } else {
    $6 = ($1|0)==(0);
    if ($6) {
     $7 = HEAP8[$src>>0]|0;
     $8 = $7&255;
     $9 = ($7<<24>>24)>(-1);
     if ($9) {
      HEAP32[$dummy$wc>>2] = $8;
      $10 = ($7<<24>>24)!=(0);
      $11 = $10&1;
      $$0 = $11;
      break;
     }
     $12 = (($8) + -194)|0;
     $13 = ($12>>>0)>(50);
     if ($13) {
      label = 15;
      break;
     }
     $14 = ((($src)) + 1|0);
     $15 = (56764 + ($12<<2)|0);
     $16 = HEAP32[$15>>2]|0;
     $17 = (($n) + -1)|0;
     $18 = ($17|0)==(0);
     if ($18) {
      $c$2 = $16;
     } else {
      $$024 = $17;$c$05 = $16;$s$06 = $14;
      label = 9;
     }
    } else {
     $$024 = $n;$c$05 = $1;$s$06 = $src;
     label = 9;
    }
    L11: do {
     if ((label|0) == 9) {
      $19 = HEAP8[$s$06>>0]|0;
      $20 = $19&255;
      $21 = $20 >>> 3;
      $22 = (($21) + -16)|0;
      $23 = $c$05 >> 26;
      $24 = (($21) + ($23))|0;
      $25 = $22 | $24;
      $26 = ($25>>>0)>(7);
      if ($26) {
       label = 15;
       break L1;
      } else {
       $$1 = $$024;$30 = $19;$c$1 = $c$05;$s$1 = $s$06;
      }
      while(1) {
       $27 = $c$1 << 6;
       $28 = ((($s$1)) + 1|0);
       $29 = $30&255;
       $31 = (($29) + -128)|0;
       $32 = $31 | $27;
       $33 = (($$1) + -1)|0;
       $34 = ($32|0)<(0);
       if (!($34)) {
        $$lcssa = $32;$$lcssa35 = $33;
        break;
       }
       $36 = ($33|0)==(0);
       if ($36) {
        $c$2 = $32;
        break L11;
       }
       $37 = HEAP8[$28>>0]|0;
       $38 = $37 & -64;
       $39 = ($38<<24>>24)==(-128);
       if ($39) {
        $$1 = $33;$30 = $37;$c$1 = $32;$s$1 = $28;
       } else {
        label = 15;
        break L1;
       }
      }
      HEAP32[$$st>>2] = 0;
      HEAP32[$dummy$wc>>2] = $$lcssa;
      $35 = (($n) - ($$lcssa35))|0;
      $$0 = $35;
      break L1;
     }
    } while(0);
    HEAP32[$$st>>2] = $c$2;
    $$0 = -2;
   }
  }
 } while(0);
 if ((label|0) == 15) {
  HEAP32[$$st>>2] = 0;
  $40 = (___errno_location()|0);
  HEAP32[$40>>2] = 84;
  $$0 = -1;
 }
 STACKTOP = sp;return ($$0|0);
}
function _mbsinit($st) {
 $st = $st|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($st|0)==(0|0);
 if ($0) {
  $4 = 1;
 } else {
  $1 = HEAP32[$st>>2]|0;
  $2 = ($1|0)==(0);
  $4 = $2;
 }
 $3 = $4&1;
 return ($3|0);
}
function _wcrtomb($s,$wc,$st) {
 $s = $s|0;
 $wc = $wc|0;
 $st = $st|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($s|0)==(0|0);
 do {
  if ($0) {
   $$0 = 1;
  } else {
   $1 = ($wc>>>0)<(128);
   if ($1) {
    $2 = $wc&255;
    HEAP8[$s>>0] = $2;
    $$0 = 1;
    break;
   }
   $3 = ($wc>>>0)<(2048);
   if ($3) {
    $4 = $wc >>> 6;
    $5 = $4 | 192;
    $6 = $5&255;
    $7 = ((($s)) + 1|0);
    HEAP8[$s>>0] = $6;
    $8 = $wc & 63;
    $9 = $8 | 128;
    $10 = $9&255;
    HEAP8[$7>>0] = $10;
    $$0 = 2;
    break;
   }
   $11 = ($wc>>>0)<(55296);
   $12 = $wc & -8192;
   $13 = ($12|0)==(57344);
   $or$cond = $11 | $13;
   if ($or$cond) {
    $14 = $wc >>> 12;
    $15 = $14 | 224;
    $16 = $15&255;
    $17 = ((($s)) + 1|0);
    HEAP8[$s>>0] = $16;
    $18 = $wc >>> 6;
    $19 = $18 & 63;
    $20 = $19 | 128;
    $21 = $20&255;
    $22 = ((($s)) + 2|0);
    HEAP8[$17>>0] = $21;
    $23 = $wc & 63;
    $24 = $23 | 128;
    $25 = $24&255;
    HEAP8[$22>>0] = $25;
    $$0 = 3;
    break;
   }
   $26 = (($wc) + -65536)|0;
   $27 = ($26>>>0)<(1048576);
   if ($27) {
    $28 = $wc >>> 18;
    $29 = $28 | 240;
    $30 = $29&255;
    $31 = ((($s)) + 1|0);
    HEAP8[$s>>0] = $30;
    $32 = $wc >>> 12;
    $33 = $32 & 63;
    $34 = $33 | 128;
    $35 = $34&255;
    $36 = ((($s)) + 2|0);
    HEAP8[$31>>0] = $35;
    $37 = $wc >>> 6;
    $38 = $37 & 63;
    $39 = $38 | 128;
    $40 = $39&255;
    $41 = ((($s)) + 3|0);
    HEAP8[$36>>0] = $40;
    $42 = $wc & 63;
    $43 = $42 | 128;
    $44 = $43&255;
    HEAP8[$41>>0] = $44;
    $$0 = 4;
    break;
   } else {
    $45 = (___errno_location()|0);
    HEAP32[$45>>2] = 84;
    $$0 = -1;
    break;
   }
  }
 } while(0);
 return ($$0|0);
}
function _wctomb($s,$wc) {
 $s = $s|0;
 $wc = $wc|0;
 var $$0 = 0, $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($s|0)==(0|0);
 if ($0) {
  $$0 = 0;
 } else {
  $1 = (_wcrtomb($s,$wc,0)|0);
  $$0 = $1;
 }
 return ($$0|0);
}
function _fclose($f) {
 $f = $f|0;
 var $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 76|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)>(-1);
 if ($2) {
  (___lockfile($f)|0);
 }
 $3 = HEAP32[$f>>2]|0;
 $4 = $3 & 1;
 $5 = ($4|0)!=(0);
 if (!($5)) {
  ___lock(((56748)|0));
  $6 = ((($f)) + 52|0);
  $7 = HEAP32[$6>>2]|0;
  $8 = ($7|0)==(0|0);
  $9 = $7;
  $$pre = ((($f)) + 56|0);
  if (!($8)) {
   $10 = HEAP32[$$pre>>2]|0;
   $11 = ((($7)) + 56|0);
   HEAP32[$11>>2] = $10;
  }
  $12 = HEAP32[$$pre>>2]|0;
  $13 = ($12|0)==(0|0);
  $14 = $12;
  if (!($13)) {
   $15 = ((($12)) + 52|0);
   HEAP32[$15>>2] = $9;
  }
  $16 = HEAP32[(56744)>>2]|0;
  $17 = ($16|0)==($f|0);
  if ($17) {
   HEAP32[(56744)>>2] = $14;
  }
  ___unlock(((56748)|0));
 }
 $18 = (_fflush($f)|0);
 $19 = ((($f)) + 12|0);
 $20 = HEAP32[$19>>2]|0;
 $21 = (FUNCTION_TABLE_ii[$20 & 1]($f)|0);
 $22 = $21 | $18;
 $23 = ((($f)) + 92|0);
 $24 = HEAP32[$23>>2]|0;
 $25 = ($24|0)==(0|0);
 if (!($25)) {
  _free($24);
 }
 if (!($5)) {
  _free($f);
 }
 return ($22|0);
}
function _feof($f) {
 $f = $f|0;
 var $$lobit = 0, $$lobit1 = 0, $$lobit2 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $phitmp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 76|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)>(-1);
 if ($2) {
  $5 = (___lockfile($f)|0);
  $phitmp = ($5|0)==(0);
  $6 = HEAP32[$f>>2]|0;
  $7 = $6 >>> 4;
  $$lobit = $7 & 1;
  if ($phitmp) {
   $$lobit2 = $$lobit;
  } else {
   ___unlockfile($f);
   $$lobit2 = $$lobit;
  }
 } else {
  $3 = HEAP32[$f>>2]|0;
  $4 = $3 >>> 4;
  $$lobit1 = $4 & 1;
  $$lobit2 = $$lobit1;
 }
 return ($$lobit2|0);
}
function _fflush($f) {
 $f = $f|0;
 var $$0 = 0, $$01 = 0, $$012 = 0, $$014 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $phitmp = 0, $r$0$lcssa = 0, $r$03 = 0, $r$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($f|0)==(0|0);
 do {
  if ($0) {
   $7 = HEAP32[56972>>2]|0;
   $8 = ($7|0)==(0|0);
   if ($8) {
    $27 = 0;
   } else {
    $9 = HEAP32[56972>>2]|0;
    $10 = (_fflush($9)|0);
    $27 = $10;
   }
   ___lock(((56748)|0));
   $$012 = HEAP32[(56744)>>2]|0;
   $11 = ($$012|0)==(0|0);
   if ($11) {
    $r$0$lcssa = $27;
   } else {
    $$014 = $$012;$r$03 = $27;
    while(1) {
     $12 = ((($$014)) + 76|0);
     $13 = HEAP32[$12>>2]|0;
     $14 = ($13|0)>(-1);
     if ($14) {
      $15 = (___lockfile($$014)|0);
      $23 = $15;
     } else {
      $23 = 0;
     }
     $16 = ((($$014)) + 20|0);
     $17 = HEAP32[$16>>2]|0;
     $18 = ((($$014)) + 28|0);
     $19 = HEAP32[$18>>2]|0;
     $20 = ($17>>>0)>($19>>>0);
     if ($20) {
      $21 = (___fflush_unlocked($$014)|0);
      $22 = $21 | $r$03;
      $r$1 = $22;
     } else {
      $r$1 = $r$03;
     }
     $24 = ($23|0)==(0);
     if (!($24)) {
      ___unlockfile($$014);
     }
     $25 = ((($$014)) + 56|0);
     $$01 = HEAP32[$25>>2]|0;
     $26 = ($$01|0)==(0|0);
     if ($26) {
      $r$0$lcssa = $r$1;
      break;
     } else {
      $$014 = $$01;$r$03 = $r$1;
     }
    }
   }
   ___unlock(((56748)|0));
   $$0 = $r$0$lcssa;
  } else {
   $1 = ((($f)) + 76|0);
   $2 = HEAP32[$1>>2]|0;
   $3 = ($2|0)>(-1);
   if (!($3)) {
    $4 = (___fflush_unlocked($f)|0);
    $$0 = $4;
    break;
   }
   $5 = (___lockfile($f)|0);
   $phitmp = ($5|0)==(0);
   $6 = (___fflush_unlocked($f)|0);
   if ($phitmp) {
    $$0 = $6;
   } else {
    ___unlockfile($f);
    $$0 = $6;
   }
  }
 } while(0);
 return ($$0|0);
}
function _fopen($filename,$mode) {
 $filename = $filename|0;
 $mode = $mode|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $memchr = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer = sp;
 $0 = HEAP8[$mode>>0]|0;
 $1 = $0 << 24 >> 24;
 $memchr = (_memchr(65931,$1,4)|0);
 $2 = ($memchr|0)==(0|0);
 if ($2) {
  $3 = (___errno_location()|0);
  HEAP32[$3>>2] = 22;
  $$0 = 0;
 } else {
  $4 = (___fmodeflags($mode)|0);
  $5 = $4 | 32768;
  HEAP32[$vararg_buffer>>2] = $filename;
  $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
  HEAP32[$vararg_ptr1>>2] = $5;
  $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
  HEAP32[$vararg_ptr2>>2] = 438;
  $6 = (___syscall5(5,($vararg_buffer|0))|0);
  $7 = (___syscall_ret($6)|0);
  $8 = ($7|0)<(0);
  if ($8) {
   $$0 = 0;
  } else {
   $9 = (___fdopen($7,$mode)|0);
   $10 = ($9|0)==(0|0);
   if ($10) {
    HEAP32[$vararg_buffer3>>2] = $7;
    (___syscall6(6,($vararg_buffer3|0))|0);
    $$0 = 0;
   } else {
    $$0 = $9;
   }
  }
 }
 STACKTOP = sp;return ($$0|0);
}
function _fprintf($f,$fmt,$varargs) {
 $f = $f|0;
 $fmt = $fmt|0;
 $varargs = $varargs|0;
 var $0 = 0, $ap = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap = sp;
 HEAP32[$ap>>2] = $varargs;
 $0 = (_vfprintf($f,$fmt,$ap)|0);
 STACKTOP = sp;return ($0|0);
}
function ___fwritex($s,$l,$f) {
 $s = $s|0;
 $l = $l|0;
 $f = $f|0;
 var $$0 = 0, $$01 = 0, $$02 = 0, $$pre = 0, $$pre6 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$0 = 0, $i$0$lcssa10 = 0;
 var $i$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0|0);
 if ($2) {
  $3 = (___towrite($f)|0);
  $4 = ($3|0)==(0);
  if ($4) {
   $$pre = HEAP32[$0>>2]|0;
   $7 = $$pre;
   label = 4;
  } else {
   $$0 = 0;
  }
 } else {
  $7 = $1;
  label = 4;
 }
 L4: do {
  if ((label|0) == 4) {
   $5 = ((($f)) + 20|0);
   $6 = HEAP32[$5>>2]|0;
   $8 = $7;
   $9 = $6;
   $10 = (($8) - ($9))|0;
   $11 = ($10>>>0)<($l>>>0);
   if ($11) {
    $12 = ((($f)) + 36|0);
    $13 = HEAP32[$12>>2]|0;
    $14 = (FUNCTION_TABLE_iiii[$13 & 7]($f,$s,$l)|0);
    $$0 = $14;
    break;
   }
   $15 = ((($f)) + 75|0);
   $16 = HEAP8[$15>>0]|0;
   $17 = ($16<<24>>24)>(-1);
   L9: do {
    if ($17) {
     $i$0 = $l;
     while(1) {
      $18 = ($i$0|0)==(0);
      if ($18) {
       $$01 = $l;$$02 = $s;$29 = $6;$i$1 = 0;
       break L9;
      }
      $19 = (($i$0) + -1)|0;
      $20 = (($s) + ($19)|0);
      $21 = HEAP8[$20>>0]|0;
      $22 = ($21<<24>>24)==(10);
      if ($22) {
       $i$0$lcssa10 = $i$0;
       break;
      } else {
       $i$0 = $19;
      }
     }
     $23 = ((($f)) + 36|0);
     $24 = HEAP32[$23>>2]|0;
     $25 = (FUNCTION_TABLE_iiii[$24 & 7]($f,$s,$i$0$lcssa10)|0);
     $26 = ($25>>>0)<($i$0$lcssa10>>>0);
     if ($26) {
      $$0 = $i$0$lcssa10;
      break L4;
     }
     $27 = (($s) + ($i$0$lcssa10)|0);
     $28 = (($l) - ($i$0$lcssa10))|0;
     $$pre6 = HEAP32[$5>>2]|0;
     $$01 = $28;$$02 = $27;$29 = $$pre6;$i$1 = $i$0$lcssa10;
    } else {
     $$01 = $l;$$02 = $s;$29 = $6;$i$1 = 0;
    }
   } while(0);
   _memcpy(($29|0),($$02|0),($$01|0))|0;
   $30 = HEAP32[$5>>2]|0;
   $31 = (($30) + ($$01)|0);
   HEAP32[$5>>2] = $31;
   $32 = (($i$1) + ($$01))|0;
   $$0 = $32;
  }
 } while(0);
 return ($$0|0);
}
function _getc($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $3 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 76|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)<(0);
 if ($2) {
  label = 3;
 } else {
  $3 = (___lockfile($f)|0);
  $4 = ($3|0)==(0);
  if ($4) {
   label = 3;
  } else {
   $14 = ((($f)) + 4|0);
   $15 = HEAP32[$14>>2]|0;
   $16 = ((($f)) + 8|0);
   $17 = HEAP32[$16>>2]|0;
   $18 = ($15>>>0)<($17>>>0);
   if ($18) {
    $19 = ((($15)) + 1|0);
    HEAP32[$14>>2] = $19;
    $20 = HEAP8[$15>>0]|0;
    $21 = $20&255;
    $23 = $21;
   } else {
    $22 = (___uflow($f)|0);
    $23 = $22;
   }
   ___unlockfile($f);
   $$0 = $23;
  }
 }
 do {
  if ((label|0) == 3) {
   $5 = ((($f)) + 4|0);
   $6 = HEAP32[$5>>2]|0;
   $7 = ((($f)) + 8|0);
   $8 = HEAP32[$7>>2]|0;
   $9 = ($6>>>0)<($8>>>0);
   if ($9) {
    $10 = ((($6)) + 1|0);
    HEAP32[$5>>2] = $10;
    $11 = HEAP8[$6>>0]|0;
    $12 = $11&255;
    $$0 = $12;
    break;
   } else {
    $13 = (___uflow($f)|0);
    $$0 = $13;
    break;
   }
  }
 } while(0);
 return ($$0|0);
}
function _printf($fmt,$varargs) {
 $fmt = $fmt|0;
 $varargs = $varargs|0;
 var $0 = 0, $1 = 0, $ap = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap = sp;
 HEAP32[$ap>>2] = $varargs;
 $0 = HEAP32[56968>>2]|0;
 $1 = (_vfprintf($0,$fmt,$ap)|0);
 STACKTOP = sp;return ($1|0);
}
function _sscanf($s,$fmt,$varargs) {
 $s = $s|0;
 $fmt = $fmt|0;
 $varargs = $varargs|0;
 var $0 = 0, $ap = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap = sp;
 HEAP32[$ap>>2] = $varargs;
 $0 = (_vsscanf($s,$fmt,$ap)|0);
 STACKTOP = sp;return ($0|0);
}
function _ungetc($c,$f) {
 $c = $c|0;
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($c|0)==(-1);
 do {
  if ($0) {
   $$0 = -1;
  } else {
   $1 = ((($f)) + 76|0);
   $2 = HEAP32[$1>>2]|0;
   $3 = ($2|0)>(-1);
   if ($3) {
    $4 = (___lockfile($f)|0);
    $16 = $4;
   } else {
    $16 = 0;
   }
   $5 = ((($f)) + 8|0);
   $6 = HEAP32[$5>>2]|0;
   $7 = ($6|0)==(0|0);
   if ($7) {
    $8 = (___toread($f)|0);
    $9 = ($8|0)==(0);
    if ($9) {
     label = 6;
    }
   } else {
    label = 6;
   }
   if ((label|0) == 6) {
    $10 = ((($f)) + 4|0);
    $11 = HEAP32[$10>>2]|0;
    $12 = ((($f)) + 44|0);
    $13 = HEAP32[$12>>2]|0;
    $14 = ((($13)) + -8|0);
    $15 = ($11>>>0)>($14>>>0);
    if ($15) {
     $18 = $c&255;
     $19 = ((($11)) + -1|0);
     HEAP32[$10>>2] = $19;
     HEAP8[$19>>0] = $18;
     $20 = HEAP32[$f>>2]|0;
     $21 = $20 & -17;
     HEAP32[$f>>2] = $21;
     $22 = ($16|0)==(0);
     if ($22) {
      $$0 = $c;
      break;
     }
     ___unlockfile($f);
     $$0 = $c;
     break;
    }
   }
   $17 = ($16|0)==(0);
   if ($17) {
    $$0 = -1;
   } else {
    ___unlockfile($f);
    $$0 = -1;
   }
  }
 } while(0);
 return ($$0|0);
}
function _vfprintf($f,$fmt,$ap) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 var $$ = 0, $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $ap2 = 0, $internal_buf = 0, $nl_arg = 0, $nl_type = 0;
 var $ret$1 = 0, $ret$1$ = 0, $vacopy_currentptr = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 224|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap2 = sp + 120|0;
 $nl_type = sp + 80|0;
 $nl_arg = sp;
 $internal_buf = sp + 136|0;
 dest=$nl_type; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $vacopy_currentptr = HEAP32[$ap>>2]|0;
 HEAP32[$ap2>>2] = $vacopy_currentptr;
 $0 = (_printf_core(0,$fmt,$ap2,$nl_arg,$nl_type)|0);
 $1 = ($0|0)<(0);
 if ($1) {
  $$0 = -1;
 } else {
  $2 = ((($f)) + 76|0);
  $3 = HEAP32[$2>>2]|0;
  $4 = ($3|0)>(-1);
  if ($4) {
   $5 = (___lockfile($f)|0);
   $32 = $5;
  } else {
   $32 = 0;
  }
  $6 = HEAP32[$f>>2]|0;
  $7 = $6 & 32;
  $8 = ((($f)) + 74|0);
  $9 = HEAP8[$8>>0]|0;
  $10 = ($9<<24>>24)<(1);
  if ($10) {
   $11 = $6 & -33;
   HEAP32[$f>>2] = $11;
  }
  $12 = ((($f)) + 48|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = ($13|0)==(0);
  if ($14) {
   $16 = ((($f)) + 44|0);
   $17 = HEAP32[$16>>2]|0;
   HEAP32[$16>>2] = $internal_buf;
   $18 = ((($f)) + 28|0);
   HEAP32[$18>>2] = $internal_buf;
   $19 = ((($f)) + 20|0);
   HEAP32[$19>>2] = $internal_buf;
   HEAP32[$12>>2] = 80;
   $20 = ((($internal_buf)) + 80|0);
   $21 = ((($f)) + 16|0);
   HEAP32[$21>>2] = $20;
   $22 = (_printf_core($f,$fmt,$ap2,$nl_arg,$nl_type)|0);
   $23 = ($17|0)==(0|0);
   if ($23) {
    $ret$1 = $22;
   } else {
    $24 = ((($f)) + 36|0);
    $25 = HEAP32[$24>>2]|0;
    (FUNCTION_TABLE_iiii[$25 & 7]($f,0,0)|0);
    $26 = HEAP32[$19>>2]|0;
    $27 = ($26|0)==(0|0);
    $$ = $27 ? -1 : $22;
    HEAP32[$16>>2] = $17;
    HEAP32[$12>>2] = 0;
    HEAP32[$21>>2] = 0;
    HEAP32[$18>>2] = 0;
    HEAP32[$19>>2] = 0;
    $ret$1 = $$;
   }
  } else {
   $15 = (_printf_core($f,$fmt,$ap2,$nl_arg,$nl_type)|0);
   $ret$1 = $15;
  }
  $28 = HEAP32[$f>>2]|0;
  $29 = $28 & 32;
  $30 = ($29|0)==(0);
  $ret$1$ = $30 ? $ret$1 : -1;
  $31 = $28 | $7;
  HEAP32[$f>>2] = $31;
  $33 = ($32|0)==(0);
  if (!($33)) {
   ___unlockfile($f);
  }
  $$0 = $ret$1$;
 }
 STACKTOP = sp;return ($$0|0);
}
function _vfscanf($f,$fmt,$ap) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 var $$ = 0, $$10 = 0, $$11 = 0, $$12 = 0, $$9 = 0, $$lcssa = 0, $$lcssa38 = 0, $$lcssa384 = 0, $$not = 0, $$old4 = 0, $$pre = 0, $$pre$phi182Z2D = 0, $$pre168 = 0, $$pre170 = 0, $$pre172 = 0, $$pre174 = 0, $$pre176 = 0, $$pre178 = 0, $$pre180 = 0, $$pre181 = 0;
 var $$size$0 = 0, $$width$0 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0;
 var $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0;
 var $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0;
 var $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0;
 var $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0;
 var $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0;
 var $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0;
 var $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0;
 var $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0;
 var $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0;
 var $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0;
 var $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0.0, $311 = 0;
 var $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0.0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0;
 var $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0;
 var $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0;
 var $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0;
 var $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $alloc$0 = 0, $alloc$0400 = 0, $alloc$1 = 0;
 var $alloc$2 = 0, $ap2$i = 0, $arglist_current = 0, $arglist_current2 = 0, $arglist_next = 0, $arglist_next3 = 0, $base$0 = 0, $c$0100 = 0, $dest$0 = 0, $expanded = 0, $expanded10 = 0, $expanded11 = 0, $expanded13 = 0, $expanded14 = 0, $expanded15 = 0, $expanded4 = 0, $expanded6 = 0, $expanded7 = 0, $expanded8 = 0, $factor = 0;
 var $factor16 = 0, $i$0$i = 0, $i$0$ph = 0, $i$0$ph$phi = 0, $i$0$ph20 = 0, $i$0$ph20$lcssa = 0, $i$1 = 0, $i$2 = 0, $i$2$ph = 0, $i$2$ph$phi = 0, $i$3 = 0, $i$4 = 0, $invert$0 = 0, $isdigit = 0, $isdigit7 = 0, $isdigit795 = 0, $isdigittmp = 0, $isdigittmp6 = 0, $isdigittmp694 = 0, $k$0$ph = 0;
 var $k$1$ph = 0, $matches$0$ = 0, $matches$0104 = 0, $matches$0104$lcssa = 0, $matches$0104376 = 0, $matches$1 = 0, $matches$2 = 0, $matches$3 = 0, $not$ = 0, $or$cond = 0, $or$cond3 = 0, $or$cond5 = 0, $or$cond8 = 0, $p$0109 = 0, $p$1 = 0, $p$1$lcssa = 0, $p$10 = 0, $p$11 = 0, $p$2 = 0, $p$3$lcssa = 0;
 var $p$396 = 0, $p$4 = 0, $p$5 = 0, $p$6 = 0, $p$7 = 0, $p$7$ph = 0, $p$8 = 0, $p$9 = 0, $pos$0108 = 0, $pos$1 = 0, $pos$2 = 0, $s$0107 = 0, $s$0107$lcssa = 0, $s$1 = 0, $s$2$ph = 0, $s$3 = 0, $s$4 = 0, $s$5 = 0, $s$6 = 0, $s$7 = 0;
 var $s$8 = 0, $scanset = 0, $size$0 = 0, $st = 0, $vacopy_currentptr = 0, $wc = 0, $wcs$0103 = 0, $wcs$0103$lcssa = 0, $wcs$1 = 0, $wcs$2 = 0, $wcs$3$ph = 0, $wcs$3$ph$lcssa = 0, $wcs$4 = 0, $wcs$5 = 0, $wcs$6 = 0, $wcs$7 = 0, $wcs$8 = 0, $wcs$9 = 0, $width$0$lcssa = 0, $width$097 = 0;
 var $width$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 304|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap2$i = sp + 16|0;
 $st = sp + 8|0;
 $scanset = sp + 33|0;
 $wc = sp;
 $0 = sp + 32|0;
 $1 = ((($f)) + 76|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)>(-1);
 if ($3) {
  $4 = (___lockfile($f)|0);
  $333 = $4;
 } else {
  $333 = 0;
 }
 $5 = HEAP8[$fmt>>0]|0;
 $6 = ($5<<24>>24)==(0);
 L4: do {
  if ($6) {
   $matches$3 = 0;
  } else {
   $7 = ((($f)) + 4|0);
   $8 = ((($f)) + 100|0);
   $9 = ((($f)) + 108|0);
   $10 = ((($f)) + 8|0);
   $11 = ((($scanset)) + 10|0);
   $12 = ((($scanset)) + 33|0);
   $13 = ((($st)) + 4|0);
   $14 = ((($scanset)) + 46|0);
   $15 = ((($scanset)) + 94|0);
   $17 = $5;$matches$0104 = 0;$p$0109 = $fmt;$pos$0108 = 0;$s$0107 = 0;$wcs$0103 = 0;
   L6: while(1) {
    $16 = $17&255;
    $18 = (_isspace($16)|0);
    $19 = ($18|0)==(0);
    L8: do {
     if ($19) {
      $46 = HEAP8[$p$0109>>0]|0;
      $47 = ($46<<24>>24)==(37);
      L10: do {
       if ($47) {
        $48 = ((($p$0109)) + 1|0);
        $49 = HEAP8[$48>>0]|0;
        L12: do {
         switch ($49<<24>>24) {
         case 37:  {
          break L10;
          break;
         }
         case 42:  {
          $70 = ((($p$0109)) + 2|0);
          $dest$0 = 0;$p$2 = $70;
          break;
         }
         default: {
          $71 = $49&255;
          $isdigittmp = (($71) + -48)|0;
          $isdigit = ($isdigittmp>>>0)<(10);
          if ($isdigit) {
           $72 = ((($p$0109)) + 2|0);
           $73 = HEAP8[$72>>0]|0;
           $74 = ($73<<24>>24)==(36);
           if ($74) {
            $vacopy_currentptr = HEAP32[$ap>>2]|0;
            HEAP32[$ap2$i>>2] = $vacopy_currentptr;
            $i$0$i = $isdigittmp;
            while(1) {
             $75 = ($i$0$i>>>0)>(1);
             $arglist_current = HEAP32[$ap2$i>>2]|0;
             $76 = $arglist_current;
             $77 = ((0) + 4|0);
             $expanded4 = $77;
             $expanded = (($expanded4) - 1)|0;
             $78 = (($76) + ($expanded))|0;
             $79 = ((0) + 4|0);
             $expanded8 = $79;
             $expanded7 = (($expanded8) - 1)|0;
             $expanded6 = $expanded7 ^ -1;
             $80 = $78 & $expanded6;
             $81 = $80;
             $82 = HEAP32[$81>>2]|0;
             $arglist_next = ((($81)) + 4|0);
             HEAP32[$ap2$i>>2] = $arglist_next;
             $83 = (($i$0$i) + -1)|0;
             if ($75) {
              $i$0$i = $83;
             } else {
              $$lcssa = $82;
              break;
             }
            }
            $84 = ((($p$0109)) + 3|0);
            $dest$0 = $$lcssa;$p$2 = $84;
            break L12;
           }
          }
          $arglist_current2 = HEAP32[$ap>>2]|0;
          $85 = $arglist_current2;
          $86 = ((0) + 4|0);
          $expanded11 = $86;
          $expanded10 = (($expanded11) - 1)|0;
          $87 = (($85) + ($expanded10))|0;
          $88 = ((0) + 4|0);
          $expanded15 = $88;
          $expanded14 = (($expanded15) - 1)|0;
          $expanded13 = $expanded14 ^ -1;
          $89 = $87 & $expanded13;
          $90 = $89;
          $91 = HEAP32[$90>>2]|0;
          $arglist_next3 = ((($90)) + 4|0);
          HEAP32[$ap>>2] = $arglist_next3;
          $dest$0 = $91;$p$2 = $48;
         }
         }
        } while(0);
        $92 = HEAP8[$p$2>>0]|0;
        $93 = $92&255;
        $isdigittmp694 = (($93) + -48)|0;
        $isdigit795 = ($isdigittmp694>>>0)<(10);
        if ($isdigit795) {
         $97 = $93;$p$396 = $p$2;$width$097 = 0;
         while(1) {
          $94 = ($width$097*10)|0;
          $95 = (($94) + -48)|0;
          $96 = (($95) + ($97))|0;
          $98 = ((($p$396)) + 1|0);
          $99 = HEAP8[$98>>0]|0;
          $100 = $99&255;
          $isdigittmp6 = (($100) + -48)|0;
          $isdigit7 = ($isdigittmp6>>>0)<(10);
          if ($isdigit7) {
           $97 = $100;$p$396 = $98;$width$097 = $96;
          } else {
           $$lcssa38 = $99;$p$3$lcssa = $98;$width$0$lcssa = $96;
           break;
          }
         }
        } else {
         $$lcssa38 = $92;$p$3$lcssa = $p$2;$width$0$lcssa = 0;
        }
        $101 = ($$lcssa38<<24>>24)==(109);
        if ($101) {
         $102 = ($dest$0|0)!=(0|0);
         $103 = $102&1;
         $104 = ((($p$3$lcssa)) + 1|0);
         $$pre168 = HEAP8[$104>>0]|0;
         $107 = $$pre168;$alloc$0 = $103;$p$4 = $104;$s$1 = 0;$wcs$1 = 0;
        } else {
         $107 = $$lcssa38;$alloc$0 = 0;$p$4 = $p$3$lcssa;$s$1 = $s$0107;$wcs$1 = $wcs$0103;
        }
        $105 = ((($p$4)) + 1|0);
        $106 = $107&255;
        switch ($106|0) {
        case 104:  {
         $108 = HEAP8[$105>>0]|0;
         $109 = ($108<<24>>24)==(104);
         $110 = ((($p$4)) + 2|0);
         $$9 = $109 ? $110 : $105;
         $$10 = $109 ? -2 : -1;
         $p$5 = $$9;$size$0 = $$10;
         break;
        }
        case 108:  {
         $111 = HEAP8[$105>>0]|0;
         $112 = ($111<<24>>24)==(108);
         $113 = ((($p$4)) + 2|0);
         $$11 = $112 ? $113 : $105;
         $$12 = $112 ? 3 : 1;
         $p$5 = $$11;$size$0 = $$12;
         break;
        }
        case 106:  {
         $p$5 = $105;$size$0 = 3;
         break;
        }
        case 116: case 122:  {
         $p$5 = $105;$size$0 = 1;
         break;
        }
        case 76:  {
         $p$5 = $105;$size$0 = 2;
         break;
        }
        case 110: case 112: case 67: case 83: case 91: case 99: case 115: case 88: case 71: case 70: case 69: case 65: case 103: case 102: case 101: case 97: case 120: case 117: case 111: case 105: case 100:  {
         $p$5 = $p$4;$size$0 = 0;
         break;
        }
        default: {
         $alloc$0400 = $alloc$0;$matches$0104376 = $matches$0104;$s$6 = $s$1;$wcs$7 = $wcs$1;
         label = 152;
         break L6;
        }
        }
        $114 = HEAP8[$p$5>>0]|0;
        $115 = $114&255;
        $116 = $115 & 47;
        $117 = ($116|0)==(3);
        $118 = $115 | 32;
        $$ = $117 ? $118 : $115;
        $$size$0 = $117 ? 1 : $size$0;
        switch ($$|0) {
        case 99:  {
         $119 = ($width$0$lcssa|0)<(1);
         $$width$0 = $119 ? 1 : $width$0$lcssa;
         $pos$1 = $pos$0108;$width$1 = $$width$0;
         break;
        }
        case 91:  {
         $pos$1 = $pos$0108;$width$1 = $width$0$lcssa;
         break;
        }
        case 110:  {
         $120 = ($pos$0108|0)<(0);
         $121 = $120 << 31 >> 31;
         $122 = ($dest$0|0)==(0|0);
         if ($122) {
          $matches$1 = $matches$0104;$p$11 = $p$5;$pos$2 = $pos$0108;$s$5 = $s$1;$wcs$6 = $wcs$1;
          break L8;
         }
         switch ($$size$0|0) {
         case -2:  {
          $123 = $pos$0108&255;
          HEAP8[$dest$0>>0] = $123;
          $matches$1 = $matches$0104;$p$11 = $p$5;$pos$2 = $pos$0108;$s$5 = $s$1;$wcs$6 = $wcs$1;
          break L8;
          break;
         }
         case -1:  {
          $124 = $pos$0108&65535;
          HEAP16[$dest$0>>1] = $124;
          $matches$1 = $matches$0104;$p$11 = $p$5;$pos$2 = $pos$0108;$s$5 = $s$1;$wcs$6 = $wcs$1;
          break L8;
          break;
         }
         case 0:  {
          HEAP32[$dest$0>>2] = $pos$0108;
          $matches$1 = $matches$0104;$p$11 = $p$5;$pos$2 = $pos$0108;$s$5 = $s$1;$wcs$6 = $wcs$1;
          break L8;
          break;
         }
         case 1:  {
          HEAP32[$dest$0>>2] = $pos$0108;
          $matches$1 = $matches$0104;$p$11 = $p$5;$pos$2 = $pos$0108;$s$5 = $s$1;$wcs$6 = $wcs$1;
          break L8;
          break;
         }
         case 3:  {
          $125 = $dest$0;
          $126 = $125;
          HEAP32[$126>>2] = $pos$0108;
          $127 = (($125) + 4)|0;
          $128 = $127;
          HEAP32[$128>>2] = $121;
          $matches$1 = $matches$0104;$p$11 = $p$5;$pos$2 = $pos$0108;$s$5 = $s$1;$wcs$6 = $wcs$1;
          break L8;
          break;
         }
         default: {
          $matches$1 = $matches$0104;$p$11 = $p$5;$pos$2 = $pos$0108;$s$5 = $s$1;$wcs$6 = $wcs$1;
          break L8;
         }
         }
         break;
        }
        default: {
         ___shlim($f,0);
         while(1) {
          $129 = HEAP32[$7>>2]|0;
          $130 = HEAP32[$8>>2]|0;
          $131 = ($129>>>0)<($130>>>0);
          if ($131) {
           $132 = ((($129)) + 1|0);
           HEAP32[$7>>2] = $132;
           $133 = HEAP8[$129>>0]|0;
           $134 = $133&255;
           $136 = $134;
          } else {
           $135 = (___shgetc($f)|0);
           $136 = $135;
          }
          $137 = (_isspace($136)|0);
          $138 = ($137|0)==(0);
          if ($138) {
           break;
          }
         }
         $139 = HEAP32[$8>>2]|0;
         $140 = ($139|0)==(0|0);
         $$pre170 = HEAP32[$7>>2]|0;
         if ($140) {
          $144 = $$pre170;
         } else {
          $141 = ((($$pre170)) + -1|0);
          HEAP32[$7>>2] = $141;
          $144 = $141;
         }
         $142 = HEAP32[$9>>2]|0;
         $143 = HEAP32[$10>>2]|0;
         $145 = $144;
         $146 = $143;
         $147 = (($142) + ($pos$0108))|0;
         $148 = (($147) + ($145))|0;
         $149 = (($148) - ($146))|0;
         $pos$1 = $149;$width$1 = $width$0$lcssa;
        }
        }
        ___shlim($f,$width$1);
        $150 = HEAP32[$7>>2]|0;
        $151 = HEAP32[$8>>2]|0;
        $152 = ($150>>>0)<($151>>>0);
        if ($152) {
         $153 = ((($150)) + 1|0);
         HEAP32[$7>>2] = $153;
         $156 = $151;
        } else {
         $154 = (___shgetc($f)|0);
         $155 = ($154|0)<(0);
         if ($155) {
          $alloc$0400 = $alloc$0;$matches$0104376 = $matches$0104;$s$6 = $s$1;$wcs$7 = $wcs$1;
          label = 152;
          break L6;
         }
         $$pre172 = HEAP32[$8>>2]|0;
         $156 = $$pre172;
        }
        $157 = ($156|0)==(0|0);
        if (!($157)) {
         $158 = HEAP32[$7>>2]|0;
         $159 = ((($158)) + -1|0);
         HEAP32[$7>>2] = $159;
        }
        L67: do {
         switch ($$|0) {
         case 91: case 99: case 115:  {
          $160 = ($$|0)==(99);
          $161 = $$ & 239;
          $162 = ($161|0)==(99);
          L69: do {
           if ($162) {
            $163 = ($$|0)==(115);
            _memset(($scanset|0),-1,257)|0;
            HEAP8[$scanset>>0] = 0;
            if ($163) {
             HEAP8[$12>>0] = 0;
             ;HEAP8[$11>>0]=0|0;HEAP8[$11+1>>0]=0|0;HEAP8[$11+2>>0]=0|0;HEAP8[$11+3>>0]=0|0;HEAP8[$11+4>>0]=0|0;
             $p$9 = $p$5;
            } else {
             $p$9 = $p$5;
            }
           } else {
            $164 = ((($p$5)) + 1|0);
            $165 = HEAP8[$164>>0]|0;
            $166 = ($165<<24>>24)==(94);
            $167 = ((($p$5)) + 2|0);
            $invert$0 = $166&1;
            $168 = $166 ? $164 : $p$5;
            $p$6 = $166 ? $167 : $164;
            $169 = $166&1;
            _memset(($scanset|0),($169|0),257)|0;
            HEAP8[$scanset>>0] = 0;
            $170 = HEAP8[$p$6>>0]|0;
            switch ($170<<24>>24) {
            case 45:  {
             $171 = ((($168)) + 2|0);
             $172 = $invert$0 ^ 1;
             $173 = $172&255;
             HEAP8[$14>>0] = $173;
             $$pre$phi182Z2D = $173;$p$7$ph = $171;
             break;
            }
            case 93:  {
             $174 = ((($168)) + 2|0);
             $175 = $invert$0 ^ 1;
             $176 = $175&255;
             HEAP8[$15>>0] = $176;
             $$pre$phi182Z2D = $176;$p$7$ph = $174;
             break;
            }
            default: {
             $$pre180 = $invert$0 ^ 1;
             $$pre181 = $$pre180&255;
             $$pre$phi182Z2D = $$pre181;$p$7$ph = $p$6;
            }
            }
            $p$7 = $p$7$ph;
            while(1) {
             $177 = HEAP8[$p$7>>0]|0;
             L80: do {
              switch ($177<<24>>24) {
              case 0:  {
               $alloc$0400 = $alloc$0;$matches$0104376 = $matches$0104;$s$6 = $s$1;$wcs$7 = $wcs$1;
               label = 152;
               break L6;
               break;
              }
              case 93:  {
               $p$9 = $p$7;
               break L69;
               break;
              }
              case 45:  {
               $178 = ((($p$7)) + 1|0);
               $179 = HEAP8[$178>>0]|0;
               switch ($179<<24>>24) {
               case 93: case 0:  {
                $190 = 45;$p$8 = $p$7;
                break L80;
                break;
               }
               default: {
               }
               }
               $180 = ((($p$7)) + -1|0);
               $181 = HEAP8[$180>>0]|0;
               $182 = ($181&255)<($179&255);
               if ($182) {
                $183 = $181&255;
                $c$0100 = $183;
                while(1) {
                 $184 = (($c$0100) + 1)|0;
                 $185 = (($scanset) + ($184)|0);
                 HEAP8[$185>>0] = $$pre$phi182Z2D;
                 $186 = HEAP8[$178>>0]|0;
                 $187 = $186&255;
                 $188 = ($184|0)<($187|0);
                 if ($188) {
                  $c$0100 = $184;
                 } else {
                  $190 = $186;$p$8 = $178;
                  break;
                 }
                }
               } else {
                $190 = $179;$p$8 = $178;
               }
               break;
              }
              default: {
               $190 = $177;$p$8 = $p$7;
              }
              }
             } while(0);
             $189 = $190&255;
             $191 = (($189) + 1)|0;
             $192 = (($scanset) + ($191)|0);
             HEAP8[$192>>0] = $$pre$phi182Z2D;
             $193 = ((($p$8)) + 1|0);
             $p$7 = $193;
            }
           }
          } while(0);
          $194 = (($width$1) + 1)|0;
          $195 = $160 ? $194 : 31;
          $196 = ($$size$0|0)==(1);
          $197 = ($alloc$0|0)!=(0);
          L88: do {
           if ($196) {
            if ($197) {
             $198 = $195 << 2;
             $199 = (_malloc($198)|0);
             $200 = ($199|0)==(0|0);
             if ($200) {
              $alloc$0400 = $alloc$0;$matches$0104376 = $matches$0104;$s$6 = 0;$wcs$7 = $199;
              label = 152;
              break L6;
             } else {
              $wcs$2 = $199;
             }
            } else {
             $wcs$2 = $dest$0;
            }
            HEAP32[$st>>2] = 0;
            HEAP32[$13>>2] = 0;
            $i$0$ph = 0;$k$0$ph = $195;$wcs$3$ph = $wcs$2;
            L94: while(1) {
             $201 = ($wcs$3$ph|0)==(0|0);
             $i$0$ph20 = $i$0$ph;
             while(1) {
              L98: while(1) {
               $202 = HEAP32[$7>>2]|0;
               $203 = HEAP32[$8>>2]|0;
               $204 = ($202>>>0)<($203>>>0);
               if ($204) {
                $205 = ((($202)) + 1|0);
                HEAP32[$7>>2] = $205;
                $206 = HEAP8[$202>>0]|0;
                $207 = $206&255;
                $210 = $207;
               } else {
                $208 = (___shgetc($f)|0);
                $210 = $208;
               }
               $209 = (($210) + 1)|0;
               $211 = (($scanset) + ($209)|0);
               $212 = HEAP8[$211>>0]|0;
               $213 = ($212<<24>>24)==(0);
               if ($213) {
                $i$0$ph20$lcssa = $i$0$ph20;$wcs$3$ph$lcssa = $wcs$3$ph;
                break L94;
               }
               $214 = $210&255;
               HEAP8[$0>>0] = $214;
               $215 = (_mbrtowc($wc,$0,1,$st)|0);
               switch ($215|0) {
               case -1:  {
                $alloc$0400 = $alloc$0;$matches$0104376 = $matches$0104;$s$6 = 0;$wcs$7 = $wcs$3$ph;
                label = 152;
                break L6;
                break;
               }
               case -2:  {
                break;
               }
               default: {
                break L98;
               }
               }
              }
              if ($201) {
               $i$1 = $i$0$ph20;
              } else {
               $216 = HEAP32[$wc>>2]|0;
               $217 = (($i$0$ph20) + 1)|0;
               $218 = (($wcs$3$ph) + ($i$0$ph20<<2)|0);
               HEAP32[$218>>2] = $216;
               $i$1 = $217;
              }
              $219 = ($i$1|0)==($k$0$ph|0);
              $or$cond = $197 & $219;
              if ($or$cond) {
               break;
              } else {
               $i$0$ph20 = $i$1;
              }
             }
             $factor = $k$0$ph << 1;
             $220 = $factor | 1;
             $221 = $220 << 2;
             $222 = (_realloc($wcs$3$ph,$221)|0);
             $223 = ($222|0)==(0|0);
             if ($223) {
              $alloc$0400 = $alloc$0;$matches$0104376 = $matches$0104;$s$6 = 0;$wcs$7 = $wcs$3$ph;
              label = 152;
              break L6;
             }
             $i$0$ph$phi = $k$0$ph;$k$0$ph = $220;$wcs$3$ph = $222;$i$0$ph = $i$0$ph$phi;
            }
            $224 = (_mbsinit($st)|0);
            $225 = ($224|0)==(0);
            if ($225) {
             $alloc$0400 = $alloc$0;$matches$0104376 = $matches$0104;$s$6 = 0;$wcs$7 = $wcs$3$ph$lcssa;
             label = 152;
             break L6;
            } else {
             $i$4 = $i$0$ph20$lcssa;$s$3 = 0;$wcs$4 = $wcs$3$ph$lcssa;
            }
           } else {
            if ($197) {
             $226 = (_malloc($195)|0);
             $227 = ($226|0)==(0|0);
             if ($227) {
              $alloc$0400 = $alloc$0;$matches$0104376 = $matches$0104;$s$6 = 0;$wcs$7 = 0;
              label = 152;
              break L6;
             } else {
              $i$2$ph = 0;$k$1$ph = $195;$s$2$ph = $226;
             }
             while(1) {
              $i$2 = $i$2$ph;
              while(1) {
               $228 = HEAP32[$7>>2]|0;
               $229 = HEAP32[$8>>2]|0;
               $230 = ($228>>>0)<($229>>>0);
               if ($230) {
                $231 = ((($228)) + 1|0);
                HEAP32[$7>>2] = $231;
                $232 = HEAP8[$228>>0]|0;
                $233 = $232&255;
                $236 = $233;
               } else {
                $234 = (___shgetc($f)|0);
                $236 = $234;
               }
               $235 = (($236) + 1)|0;
               $237 = (($scanset) + ($235)|0);
               $238 = HEAP8[$237>>0]|0;
               $239 = ($238<<24>>24)==(0);
               if ($239) {
                $i$4 = $i$2;$s$3 = $s$2$ph;$wcs$4 = 0;
                break L88;
               }
               $240 = $236&255;
               $241 = (($i$2) + 1)|0;
               $242 = (($s$2$ph) + ($i$2)|0);
               HEAP8[$242>>0] = $240;
               $243 = ($241|0)==($k$1$ph|0);
               if ($243) {
                break;
               } else {
                $i$2 = $241;
               }
              }
              $factor16 = $k$1$ph << 1;
              $244 = $factor16 | 1;
              $245 = (_realloc($s$2$ph,$244)|0);
              $246 = ($245|0)==(0|0);
              if ($246) {
               $alloc$0400 = $alloc$0;$matches$0104376 = $matches$0104;$s$6 = $s$2$ph;$wcs$7 = 0;
               label = 152;
               break L6;
              } else {
               $i$2$ph$phi = $k$1$ph;$k$1$ph = $244;$s$2$ph = $245;$i$2$ph = $i$2$ph$phi;
              }
             }
            }
            $247 = ($dest$0|0)==(0|0);
            if ($247) {
             $265 = $156;
             while(1) {
              $263 = HEAP32[$7>>2]|0;
              $264 = ($263>>>0)<($265>>>0);
              if ($264) {
               $266 = ((($263)) + 1|0);
               HEAP32[$7>>2] = $266;
               $267 = HEAP8[$263>>0]|0;
               $268 = $267&255;
               $271 = $268;
              } else {
               $269 = (___shgetc($f)|0);
               $271 = $269;
              }
              $270 = (($271) + 1)|0;
              $272 = (($scanset) + ($270)|0);
              $273 = HEAP8[$272>>0]|0;
              $274 = ($273<<24>>24)==(0);
              if ($274) {
               $i$4 = 0;$s$3 = 0;$wcs$4 = 0;
               break L88;
              }
              $$pre176 = HEAP32[$8>>2]|0;
              $265 = $$pre176;
             }
            } else {
             $250 = $156;$i$3 = 0;
             while(1) {
              $248 = HEAP32[$7>>2]|0;
              $249 = ($248>>>0)<($250>>>0);
              if ($249) {
               $251 = ((($248)) + 1|0);
               HEAP32[$7>>2] = $251;
               $252 = HEAP8[$248>>0]|0;
               $253 = $252&255;
               $256 = $253;
              } else {
               $254 = (___shgetc($f)|0);
               $256 = $254;
              }
              $255 = (($256) + 1)|0;
              $257 = (($scanset) + ($255)|0);
              $258 = HEAP8[$257>>0]|0;
              $259 = ($258<<24>>24)==(0);
              if ($259) {
               $i$4 = $i$3;$s$3 = $dest$0;$wcs$4 = 0;
               break L88;
              }
              $260 = $256&255;
              $261 = (($i$3) + 1)|0;
              $262 = (($dest$0) + ($i$3)|0);
              HEAP8[$262>>0] = $260;
              $$pre174 = HEAP32[$8>>2]|0;
              $250 = $$pre174;$i$3 = $261;
             }
            }
           }
          } while(0);
          $275 = HEAP32[$8>>2]|0;
          $276 = ($275|0)==(0|0);
          $$pre178 = HEAP32[$7>>2]|0;
          if ($276) {
           $280 = $$pre178;
          } else {
           $277 = ((($$pre178)) + -1|0);
           HEAP32[$7>>2] = $277;
           $280 = $277;
          }
          $278 = HEAP32[$9>>2]|0;
          $279 = HEAP32[$10>>2]|0;
          $281 = $280;
          $282 = $279;
          $283 = (($281) - ($282))|0;
          $284 = (($283) + ($278))|0;
          $285 = ($284|0)==(0);
          if ($285) {
           $alloc$2 = $alloc$0;$matches$2 = $matches$0104;$s$8 = $s$3;$wcs$9 = $wcs$4;
           break L6;
          }
          $$not = $160 ^ 1;
          $286 = ($284|0)==($width$1|0);
          $or$cond8 = $286 | $$not;
          if (!($or$cond8)) {
           $alloc$2 = $alloc$0;$matches$2 = $matches$0104;$s$8 = $s$3;$wcs$9 = $wcs$4;
           break L6;
          }
          do {
           if ($197) {
            if ($196) {
             HEAP32[$dest$0>>2] = $wcs$4;
             break;
            } else {
             HEAP32[$dest$0>>2] = $s$3;
             break;
            }
           }
          } while(0);
          if ($160) {
           $p$10 = $p$9;$s$4 = $s$3;$wcs$5 = $wcs$4;
          } else {
           $287 = ($wcs$4|0)==(0|0);
           if (!($287)) {
            $288 = (($wcs$4) + ($i$4<<2)|0);
            HEAP32[$288>>2] = 0;
           }
           $289 = ($s$3|0)==(0|0);
           if ($289) {
            $p$10 = $p$9;$s$4 = 0;$wcs$5 = $wcs$4;
            break L67;
           }
           $290 = (($s$3) + ($i$4)|0);
           HEAP8[$290>>0] = 0;
           $p$10 = $p$9;$s$4 = $s$3;$wcs$5 = $wcs$4;
          }
          break;
         }
         case 120: case 88: case 112:  {
          $base$0 = 16;
          label = 134;
          break;
         }
         case 111:  {
          $base$0 = 8;
          label = 134;
          break;
         }
         case 117: case 100:  {
          $base$0 = 10;
          label = 134;
          break;
         }
         case 105:  {
          $base$0 = 0;
          label = 134;
          break;
         }
         case 71: case 103: case 70: case 102: case 69: case 101: case 65: case 97:  {
          $310 = (+___floatscan($f,$$size$0,0));
          $311 = HEAP32[$9>>2]|0;
          $312 = HEAP32[$7>>2]|0;
          $313 = HEAP32[$10>>2]|0;
          $314 = $312;
          $315 = $313;
          $316 = (($315) - ($314))|0;
          $317 = ($311|0)==($316|0);
          if ($317) {
           $alloc$2 = $alloc$0;$matches$2 = $matches$0104;$s$8 = $s$1;$wcs$9 = $wcs$1;
           break L6;
          }
          $318 = ($dest$0|0)==(0|0);
          if ($318) {
           $p$10 = $p$5;$s$4 = $s$1;$wcs$5 = $wcs$1;
          } else {
           switch ($$size$0|0) {
           case 0:  {
            $319 = $310;
            HEAPF32[$dest$0>>2] = $319;
            $p$10 = $p$5;$s$4 = $s$1;$wcs$5 = $wcs$1;
            break L67;
            break;
           }
           case 1:  {
            HEAPF64[$dest$0>>3] = $310;
            $p$10 = $p$5;$s$4 = $s$1;$wcs$5 = $wcs$1;
            break L67;
            break;
           }
           case 2:  {
            HEAPF64[$dest$0>>3] = $310;
            $p$10 = $p$5;$s$4 = $s$1;$wcs$5 = $wcs$1;
            break L67;
            break;
           }
           default: {
            $p$10 = $p$5;$s$4 = $s$1;$wcs$5 = $wcs$1;
            break L67;
           }
           }
          }
          break;
         }
         default: {
          $p$10 = $p$5;$s$4 = $s$1;$wcs$5 = $wcs$1;
         }
         }
        } while(0);
        L168: do {
         if ((label|0) == 134) {
          label = 0;
          $291 = (___intscan($f,$base$0,0,-1,-1)|0);
          $292 = tempRet0;
          $293 = HEAP32[$9>>2]|0;
          $294 = HEAP32[$7>>2]|0;
          $295 = HEAP32[$10>>2]|0;
          $296 = $294;
          $297 = $295;
          $298 = (($297) - ($296))|0;
          $299 = ($293|0)==($298|0);
          if ($299) {
           $alloc$2 = $alloc$0;$matches$2 = $matches$0104;$s$8 = $s$1;$wcs$9 = $wcs$1;
           break L6;
          }
          $300 = ($$|0)==(112);
          $301 = ($dest$0|0)!=(0|0);
          $or$cond3 = $301 & $300;
          if ($or$cond3) {
           $302 = $291;
           HEAP32[$dest$0>>2] = $302;
           $p$10 = $p$5;$s$4 = $s$1;$wcs$5 = $wcs$1;
           break;
          }
          $303 = ($dest$0|0)==(0|0);
          if ($303) {
           $p$10 = $p$5;$s$4 = $s$1;$wcs$5 = $wcs$1;
          } else {
           switch ($$size$0|0) {
           case -2:  {
            $304 = $291&255;
            HEAP8[$dest$0>>0] = $304;
            $p$10 = $p$5;$s$4 = $s$1;$wcs$5 = $wcs$1;
            break L168;
            break;
           }
           case -1:  {
            $305 = $291&65535;
            HEAP16[$dest$0>>1] = $305;
            $p$10 = $p$5;$s$4 = $s$1;$wcs$5 = $wcs$1;
            break L168;
            break;
           }
           case 0:  {
            HEAP32[$dest$0>>2] = $291;
            $p$10 = $p$5;$s$4 = $s$1;$wcs$5 = $wcs$1;
            break L168;
            break;
           }
           case 1:  {
            HEAP32[$dest$0>>2] = $291;
            $p$10 = $p$5;$s$4 = $s$1;$wcs$5 = $wcs$1;
            break L168;
            break;
           }
           case 3:  {
            $306 = $dest$0;
            $307 = $306;
            HEAP32[$307>>2] = $291;
            $308 = (($306) + 4)|0;
            $309 = $308;
            HEAP32[$309>>2] = $292;
            $p$10 = $p$5;$s$4 = $s$1;$wcs$5 = $wcs$1;
            break L168;
            break;
           }
           default: {
            $p$10 = $p$5;$s$4 = $s$1;$wcs$5 = $wcs$1;
            break L168;
           }
           }
          }
         }
        } while(0);
        $320 = HEAP32[$9>>2]|0;
        $321 = HEAP32[$7>>2]|0;
        $322 = HEAP32[$10>>2]|0;
        $323 = $321;
        $324 = $322;
        $325 = (($320) + ($pos$1))|0;
        $326 = (($325) + ($323))|0;
        $327 = (($326) - ($324))|0;
        $not$ = ($dest$0|0)!=(0|0);
        $328 = $not$&1;
        $matches$0$ = (($328) + ($matches$0104))|0;
        $matches$1 = $matches$0$;$p$11 = $p$10;$pos$2 = $327;$s$5 = $s$4;$wcs$6 = $wcs$5;
        break L8;
       }
      } while(0);
      $50 = $47&1;
      $51 = (($p$0109) + ($50)|0);
      ___shlim($f,0);
      $52 = HEAP32[$7>>2]|0;
      $53 = HEAP32[$8>>2]|0;
      $54 = ($52>>>0)<($53>>>0);
      if ($54) {
       $55 = ((($52)) + 1|0);
       HEAP32[$7>>2] = $55;
       $56 = HEAP8[$52>>0]|0;
       $57 = $56&255;
       $61 = $57;
      } else {
       $58 = (___shgetc($f)|0);
       $61 = $58;
      }
      $59 = HEAP8[$51>>0]|0;
      $60 = $59&255;
      $62 = ($61|0)==($60|0);
      if (!($62)) {
       $$lcssa384 = $61;$matches$0104$lcssa = $matches$0104;$s$0107$lcssa = $s$0107;$wcs$0103$lcssa = $wcs$0103;
       label = 21;
       break L6;
      }
      $69 = (($pos$0108) + 1)|0;
      $matches$1 = $matches$0104;$p$11 = $51;$pos$2 = $69;$s$5 = $s$0107;$wcs$6 = $wcs$0103;
     } else {
      $p$1 = $p$0109;
      while(1) {
       $20 = ((($p$1)) + 1|0);
       $21 = HEAP8[$20>>0]|0;
       $22 = $21&255;
       $23 = (_isspace($22)|0);
       $24 = ($23|0)==(0);
       if ($24) {
        $p$1$lcssa = $p$1;
        break;
       } else {
        $p$1 = $20;
       }
      }
      ___shlim($f,0);
      while(1) {
       $25 = HEAP32[$7>>2]|0;
       $26 = HEAP32[$8>>2]|0;
       $27 = ($25>>>0)<($26>>>0);
       if ($27) {
        $28 = ((($25)) + 1|0);
        HEAP32[$7>>2] = $28;
        $29 = HEAP8[$25>>0]|0;
        $30 = $29&255;
        $32 = $30;
       } else {
        $31 = (___shgetc($f)|0);
        $32 = $31;
       }
       $33 = (_isspace($32)|0);
       $34 = ($33|0)==(0);
       if ($34) {
        break;
       }
      }
      $35 = HEAP32[$8>>2]|0;
      $36 = ($35|0)==(0|0);
      $$pre = HEAP32[$7>>2]|0;
      if ($36) {
       $40 = $$pre;
      } else {
       $37 = ((($$pre)) + -1|0);
       HEAP32[$7>>2] = $37;
       $40 = $37;
      }
      $38 = HEAP32[$9>>2]|0;
      $39 = HEAP32[$10>>2]|0;
      $41 = $40;
      $42 = $39;
      $43 = (($38) + ($pos$0108))|0;
      $44 = (($43) + ($41))|0;
      $45 = (($44) - ($42))|0;
      $matches$1 = $matches$0104;$p$11 = $p$1$lcssa;$pos$2 = $45;$s$5 = $s$0107;$wcs$6 = $wcs$0103;
     }
    } while(0);
    $329 = ((($p$11)) + 1|0);
    $330 = HEAP8[$329>>0]|0;
    $331 = ($330<<24>>24)==(0);
    if ($331) {
     $matches$3 = $matches$1;
     break L4;
    } else {
     $17 = $330;$matches$0104 = $matches$1;$p$0109 = $329;$pos$0108 = $pos$2;$s$0107 = $s$5;$wcs$0103 = $wcs$6;
    }
   }
   if ((label|0) == 21) {
    $63 = HEAP32[$8>>2]|0;
    $64 = ($63|0)==(0|0);
    if (!($64)) {
     $65 = HEAP32[$7>>2]|0;
     $66 = ((($65)) + -1|0);
     HEAP32[$7>>2] = $66;
    }
    $67 = ($$lcssa384|0)>(-1);
    $68 = ($matches$0104$lcssa|0)!=(0);
    $or$cond5 = $68 | $67;
    if ($or$cond5) {
     $matches$3 = $matches$0104$lcssa;
     break;
    } else {
     $alloc$1 = 0;$s$7 = $s$0107$lcssa;$wcs$8 = $wcs$0103$lcssa;
     label = 153;
    }
   }
   else if ((label|0) == 152) {
    $$old4 = ($matches$0104376|0)==(0);
    if ($$old4) {
     $alloc$1 = $alloc$0400;$s$7 = $s$6;$wcs$8 = $wcs$7;
     label = 153;
    } else {
     $alloc$2 = $alloc$0400;$matches$2 = $matches$0104376;$s$8 = $s$6;$wcs$9 = $wcs$7;
    }
   }
   if ((label|0) == 153) {
    $alloc$2 = $alloc$1;$matches$2 = -1;$s$8 = $s$7;$wcs$9 = $wcs$8;
   }
   $332 = ($alloc$2|0)==(0);
   if ($332) {
    $matches$3 = $matches$2;
   } else {
    _free($s$8);
    _free($wcs$9);
    $matches$3 = $matches$2;
   }
  }
 } while(0);
 $334 = ($333|0)==(0);
 if (!($334)) {
  ___unlockfile($f);
 }
 STACKTOP = sp;return ($matches$3|0);
}
function _vsscanf($s,$fmt,$ap) {
 $s = $s|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $f = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f = sp;
 dest=$f; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $0 = ((($f)) + 32|0);
 HEAP32[$0>>2] = 4;
 $1 = ((($f)) + 44|0);
 HEAP32[$1>>2] = $s;
 $2 = ((($f)) + 76|0);
 HEAP32[$2>>2] = -1;
 $3 = ((($f)) + 84|0);
 HEAP32[$3>>2] = $s;
 $4 = (_vfscanf($f,$fmt,$ap)|0);
 STACKTOP = sp;return ($4|0);
}
function ___fdopen($fd,$mode) {
 $fd = $fd|0;
 $mode = $mode|0;
 var $$0 = 0, $$pre = 0, $$pre1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $memchr = 0, $tio = 0, $vararg_buffer = 0, $vararg_buffer12 = 0, $vararg_buffer3 = 0, $vararg_buffer7 = 0, $vararg_ptr1 = 0, $vararg_ptr10 = 0, $vararg_ptr11 = 0, $vararg_ptr15 = 0, $vararg_ptr16 = 0, $vararg_ptr2 = 0, $vararg_ptr6 = 0, dest = 0, label = 0;
 var sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer12 = sp + 40|0;
 $vararg_buffer7 = sp + 24|0;
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer = sp;
 $tio = sp + 52|0;
 $0 = HEAP8[$mode>>0]|0;
 $1 = $0 << 24 >> 24;
 $memchr = (_memchr(65931,$1,4)|0);
 $2 = ($memchr|0)==(0|0);
 if ($2) {
  $3 = (___errno_location()|0);
  HEAP32[$3>>2] = 22;
  $$0 = 0;
 } else {
  $4 = (_malloc(1144)|0);
  $5 = ($4|0)==(0|0);
  if ($5) {
   $$0 = 0;
  } else {
   dest=$4; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
   $6 = (_strchr($mode,43)|0);
   $7 = ($6|0)==(0|0);
   if ($7) {
    $8 = ($0<<24>>24)==(114);
    $9 = $8 ? 8 : 4;
    HEAP32[$4>>2] = $9;
   }
   $10 = (_strchr($mode,101)|0);
   $11 = ($10|0)==(0|0);
   if ($11) {
    $12 = $0;
   } else {
    HEAP32[$vararg_buffer>>2] = $fd;
    $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
    HEAP32[$vararg_ptr1>>2] = 2;
    $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
    HEAP32[$vararg_ptr2>>2] = 1;
    (___syscall221(221,($vararg_buffer|0))|0);
    $$pre = HEAP8[$mode>>0]|0;
    $12 = $$pre;
   }
   $13 = ($12<<24>>24)==(97);
   if ($13) {
    HEAP32[$vararg_buffer3>>2] = $fd;
    $vararg_ptr6 = ((($vararg_buffer3)) + 4|0);
    HEAP32[$vararg_ptr6>>2] = 3;
    $14 = (___syscall221(221,($vararg_buffer3|0))|0);
    $15 = $14 & 1024;
    $16 = ($15|0)==(0);
    if ($16) {
     $17 = $14 | 1024;
     HEAP32[$vararg_buffer7>>2] = $fd;
     $vararg_ptr10 = ((($vararg_buffer7)) + 4|0);
     HEAP32[$vararg_ptr10>>2] = 4;
     $vararg_ptr11 = ((($vararg_buffer7)) + 8|0);
     HEAP32[$vararg_ptr11>>2] = $17;
     (___syscall221(221,($vararg_buffer7|0))|0);
    }
    $18 = HEAP32[$4>>2]|0;
    $19 = $18 | 128;
    HEAP32[$4>>2] = $19;
    $26 = $19;
   } else {
    $$pre1 = HEAP32[$4>>2]|0;
    $26 = $$pre1;
   }
   $20 = ((($4)) + 60|0);
   HEAP32[$20>>2] = $fd;
   $21 = ((($4)) + 120|0);
   $22 = ((($4)) + 44|0);
   HEAP32[$22>>2] = $21;
   $23 = ((($4)) + 48|0);
   HEAP32[$23>>2] = 1024;
   $24 = ((($4)) + 75|0);
   HEAP8[$24>>0] = -1;
   $25 = $26 & 8;
   $27 = ($25|0)==(0);
   if ($27) {
    HEAP32[$vararg_buffer12>>2] = $fd;
    $vararg_ptr15 = ((($vararg_buffer12)) + 4|0);
    HEAP32[$vararg_ptr15>>2] = 21505;
    $vararg_ptr16 = ((($vararg_buffer12)) + 8|0);
    HEAP32[$vararg_ptr16>>2] = $tio;
    $28 = (___syscall54(54,($vararg_buffer12|0))|0);
    $29 = ($28|0)==(0);
    if ($29) {
     HEAP8[$24>>0] = 10;
    }
   }
   $30 = ((($4)) + 32|0);
   HEAP32[$30>>2] = 5;
   $31 = ((($4)) + 36|0);
   HEAP32[$31>>2] = 6;
   $32 = ((($4)) + 40|0);
   HEAP32[$32>>2] = 3;
   $33 = ((($4)) + 12|0);
   HEAP32[$33>>2] = 1;
   $34 = HEAP32[(56724)>>2]|0;
   $35 = ($34|0)==(0);
   if ($35) {
    $36 = ((($4)) + 76|0);
    HEAP32[$36>>2] = -1;
   }
   ___lock(((56748)|0));
   $37 = HEAP32[(56744)>>2]|0;
   $38 = ((($4)) + 56|0);
   HEAP32[$38>>2] = $37;
   $39 = ($37|0)==(0);
   if (!($39)) {
    $40 = $37;
    $41 = ((($40)) + 52|0);
    HEAP32[$41>>2] = $4;
   }
   HEAP32[(56744)>>2] = $4;
   ___unlock(((56748)|0));
   $$0 = $4;
  }
 }
 STACKTOP = sp;return ($$0|0);
}
function ___fmodeflags($mode) {
 $mode = $mode|0;
 var $$ = 0, $$flags$4 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $flags$0 = 0, $flags$0$ = 0, $flags$2 = 0;
 var $flags$2$ = 0, $flags$4 = 0, $not$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_strchr($mode,43)|0);
 $1 = ($0|0)==(0|0);
 $2 = HEAP8[$mode>>0]|0;
 $not$ = ($2<<24>>24)!=(114);
 $$ = $not$&1;
 $flags$0 = $1 ? $$ : 2;
 $3 = (_strchr($mode,120)|0);
 $4 = ($3|0)==(0|0);
 $5 = $flags$0 | 128;
 $flags$0$ = $4 ? $flags$0 : $5;
 $6 = (_strchr($mode,101)|0);
 $7 = ($6|0)==(0|0);
 $8 = $flags$0$ | 524288;
 $flags$2 = $7 ? $flags$0$ : $8;
 $9 = ($2<<24>>24)==(114);
 $10 = $flags$2 | 64;
 $flags$2$ = $9 ? $flags$2 : $10;
 $11 = ($2<<24>>24)==(119);
 $12 = $flags$2$ | 512;
 $flags$4 = $11 ? $12 : $flags$2$;
 $13 = ($2<<24>>24)==(97);
 $14 = $flags$4 | 1024;
 $$flags$4 = $13 ? $14 : $flags$4;
 return ($$flags$4|0);
}
function ___lockfile($f) {
 $f = $f|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function ___unlockfile($f) {
 $f = $f|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function ___stdio_close($f) {
 $f = $f|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $0 = ((($f)) + 60|0);
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$vararg_buffer>>2] = $1;
 $2 = (___syscall6(6,($vararg_buffer|0))|0);
 $3 = (___syscall_ret($2)|0);
 STACKTOP = sp;return ($3|0);
}
function ___stdio_read($f,$buf,$len) {
 $f = $f|0;
 $buf = $buf|0;
 $len = $len|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $cnt$0 = 0, $iov = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $vararg_ptr6 = 0, $vararg_ptr7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer = sp;
 $iov = sp + 32|0;
 HEAP32[$iov>>2] = $buf;
 $0 = ((($iov)) + 4|0);
 $1 = ((($f)) + 48|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)!=(0);
 $4 = $3&1;
 $5 = (($len) - ($4))|0;
 HEAP32[$0>>2] = $5;
 $6 = ((($iov)) + 8|0);
 $7 = ((($f)) + 44|0);
 $8 = HEAP32[$7>>2]|0;
 HEAP32[$6>>2] = $8;
 $9 = ((($iov)) + 12|0);
 HEAP32[$9>>2] = $2;
 $10 = HEAP32[56720>>2]|0;
 $11 = ($10|0)==(0|0);
 if ($11) {
  $16 = ((($f)) + 60|0);
  $17 = HEAP32[$16>>2]|0;
  HEAP32[$vararg_buffer3>>2] = $17;
  $vararg_ptr6 = ((($vararg_buffer3)) + 4|0);
  HEAP32[$vararg_ptr6>>2] = $iov;
  $vararg_ptr7 = ((($vararg_buffer3)) + 8|0);
  HEAP32[$vararg_ptr7>>2] = 2;
  $18 = (___syscall145(145,($vararg_buffer3|0))|0);
  $19 = (___syscall_ret($18)|0);
  $cnt$0 = $19;
 } else {
  _pthread_cleanup_push((7|0),($f|0));
  $12 = ((($f)) + 60|0);
  $13 = HEAP32[$12>>2]|0;
  HEAP32[$vararg_buffer>>2] = $13;
  $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
  HEAP32[$vararg_ptr1>>2] = $iov;
  $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
  HEAP32[$vararg_ptr2>>2] = 2;
  $14 = (___syscall145(145,($vararg_buffer|0))|0);
  $15 = (___syscall_ret($14)|0);
  _pthread_cleanup_pop(0);
  $cnt$0 = $15;
 }
 $20 = ($cnt$0|0)<(1);
 if ($20) {
  $21 = $cnt$0 & 48;
  $22 = $21 ^ 16;
  $23 = HEAP32[$f>>2]|0;
  $24 = $23 | $22;
  HEAP32[$f>>2] = $24;
  $25 = ((($f)) + 8|0);
  HEAP32[$25>>2] = 0;
  $26 = ((($f)) + 4|0);
  HEAP32[$26>>2] = 0;
  $$0 = $cnt$0;
 } else {
  $27 = HEAP32[$0>>2]|0;
  $28 = ($cnt$0>>>0)>($27>>>0);
  if ($28) {
   $29 = (($cnt$0) - ($27))|0;
   $30 = HEAP32[$7>>2]|0;
   $31 = ((($f)) + 4|0);
   HEAP32[$31>>2] = $30;
   $32 = $30;
   $33 = (($32) + ($29)|0);
   $34 = ((($f)) + 8|0);
   HEAP32[$34>>2] = $33;
   $35 = HEAP32[$1>>2]|0;
   $36 = ($35|0)==(0);
   if ($36) {
    $$0 = $len;
   } else {
    $37 = ((($32)) + 1|0);
    HEAP32[$31>>2] = $37;
    $38 = HEAP8[$32>>0]|0;
    $39 = (($len) + -1)|0;
    $40 = (($buf) + ($39)|0);
    HEAP8[$40>>0] = $38;
    $$0 = $len;
   }
  } else {
   $$0 = $cnt$0;
  }
 }
 STACKTOP = sp;return ($$0|0);
}
function ___stdio_seek($f,$off,$whence) {
 $f = $f|0;
 $off = $off|0;
 $whence = $whence|0;
 var $$pre = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $ret = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $vararg_ptr3 = 0, $vararg_ptr4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $ret = sp + 20|0;
 $0 = ((($f)) + 60|0);
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$vararg_buffer>>2] = $1;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = 0;
 $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
 HEAP32[$vararg_ptr2>>2] = $off;
 $vararg_ptr3 = ((($vararg_buffer)) + 12|0);
 HEAP32[$vararg_ptr3>>2] = $ret;
 $vararg_ptr4 = ((($vararg_buffer)) + 16|0);
 HEAP32[$vararg_ptr4>>2] = $whence;
 $2 = (___syscall140(140,($vararg_buffer|0))|0);
 $3 = (___syscall_ret($2)|0);
 $4 = ($3|0)<(0);
 if ($4) {
  HEAP32[$ret>>2] = -1;
  $5 = -1;
 } else {
  $$pre = HEAP32[$ret>>2]|0;
  $5 = $$pre;
 }
 STACKTOP = sp;return ($5|0);
}
function ___stdio_write($f,$buf,$len) {
 $f = $f|0;
 $buf = $buf|0;
 $len = $len|0;
 var $$0 = 0, $$phi$trans$insert = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $cnt$0 = 0, $cnt$1 = 0, $iov$0 = 0, $iov$0$lcssa11 = 0, $iov$1 = 0, $iovcnt$0 = 0;
 var $iovcnt$0$lcssa12 = 0, $iovcnt$1 = 0, $iovs = 0, $rem$0 = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $vararg_ptr6 = 0, $vararg_ptr7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer = sp;
 $iovs = sp + 32|0;
 $0 = ((($f)) + 28|0);
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$iovs>>2] = $1;
 $2 = ((($iovs)) + 4|0);
 $3 = ((($f)) + 20|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = $4;
 $6 = (($5) - ($1))|0;
 HEAP32[$2>>2] = $6;
 $7 = ((($iovs)) + 8|0);
 HEAP32[$7>>2] = $buf;
 $8 = ((($iovs)) + 12|0);
 HEAP32[$8>>2] = $len;
 $9 = (($6) + ($len))|0;
 $10 = ((($f)) + 60|0);
 $11 = ((($f)) + 44|0);
 $iov$0 = $iovs;$iovcnt$0 = 2;$rem$0 = $9;
 while(1) {
  $12 = HEAP32[56720>>2]|0;
  $13 = ($12|0)==(0|0);
  if ($13) {
   $17 = HEAP32[$10>>2]|0;
   HEAP32[$vararg_buffer3>>2] = $17;
   $vararg_ptr6 = ((($vararg_buffer3)) + 4|0);
   HEAP32[$vararg_ptr6>>2] = $iov$0;
   $vararg_ptr7 = ((($vararg_buffer3)) + 8|0);
   HEAP32[$vararg_ptr7>>2] = $iovcnt$0;
   $18 = (___syscall146(146,($vararg_buffer3|0))|0);
   $19 = (___syscall_ret($18)|0);
   $cnt$0 = $19;
  } else {
   _pthread_cleanup_push((8|0),($f|0));
   $14 = HEAP32[$10>>2]|0;
   HEAP32[$vararg_buffer>>2] = $14;
   $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
   HEAP32[$vararg_ptr1>>2] = $iov$0;
   $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
   HEAP32[$vararg_ptr2>>2] = $iovcnt$0;
   $15 = (___syscall146(146,($vararg_buffer|0))|0);
   $16 = (___syscall_ret($15)|0);
   _pthread_cleanup_pop(0);
   $cnt$0 = $16;
  }
  $20 = ($rem$0|0)==($cnt$0|0);
  if ($20) {
   label = 6;
   break;
  }
  $27 = ($cnt$0|0)<(0);
  if ($27) {
   $iov$0$lcssa11 = $iov$0;$iovcnt$0$lcssa12 = $iovcnt$0;
   label = 8;
   break;
  }
  $35 = (($rem$0) - ($cnt$0))|0;
  $36 = ((($iov$0)) + 4|0);
  $37 = HEAP32[$36>>2]|0;
  $38 = ($cnt$0>>>0)>($37>>>0);
  if ($38) {
   $39 = HEAP32[$11>>2]|0;
   HEAP32[$0>>2] = $39;
   HEAP32[$3>>2] = $39;
   $40 = (($cnt$0) - ($37))|0;
   $41 = ((($iov$0)) + 8|0);
   $42 = (($iovcnt$0) + -1)|0;
   $$phi$trans$insert = ((($iov$0)) + 12|0);
   $$pre = HEAP32[$$phi$trans$insert>>2]|0;
   $50 = $$pre;$cnt$1 = $40;$iov$1 = $41;$iovcnt$1 = $42;
  } else {
   $43 = ($iovcnt$0|0)==(2);
   if ($43) {
    $44 = HEAP32[$0>>2]|0;
    $45 = (($44) + ($cnt$0)|0);
    HEAP32[$0>>2] = $45;
    $50 = $37;$cnt$1 = $cnt$0;$iov$1 = $iov$0;$iovcnt$1 = 2;
   } else {
    $50 = $37;$cnt$1 = $cnt$0;$iov$1 = $iov$0;$iovcnt$1 = $iovcnt$0;
   }
  }
  $46 = HEAP32[$iov$1>>2]|0;
  $47 = (($46) + ($cnt$1)|0);
  HEAP32[$iov$1>>2] = $47;
  $48 = ((($iov$1)) + 4|0);
  $49 = (($50) - ($cnt$1))|0;
  HEAP32[$48>>2] = $49;
  $iov$0 = $iov$1;$iovcnt$0 = $iovcnt$1;$rem$0 = $35;
 }
 if ((label|0) == 6) {
  $21 = HEAP32[$11>>2]|0;
  $22 = ((($f)) + 48|0);
  $23 = HEAP32[$22>>2]|0;
  $24 = (($21) + ($23)|0);
  $25 = ((($f)) + 16|0);
  HEAP32[$25>>2] = $24;
  $26 = $21;
  HEAP32[$0>>2] = $26;
  HEAP32[$3>>2] = $26;
  $$0 = $len;
 }
 else if ((label|0) == 8) {
  $28 = ((($f)) + 16|0);
  HEAP32[$28>>2] = 0;
  HEAP32[$0>>2] = 0;
  HEAP32[$3>>2] = 0;
  $29 = HEAP32[$f>>2]|0;
  $30 = $29 | 32;
  HEAP32[$f>>2] = $30;
  $31 = ($iovcnt$0$lcssa12|0)==(2);
  if ($31) {
   $$0 = 0;
  } else {
   $32 = ((($iov$0$lcssa11)) + 4|0);
   $33 = HEAP32[$32>>2]|0;
   $34 = (($len) - ($33))|0;
   $$0 = $34;
  }
 }
 STACKTOP = sp;return ($$0|0);
}
function ___stdout_write($f,$buf,$len) {
 $f = $f|0;
 $buf = $buf|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $tio = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $tio = sp + 12|0;
 $0 = ((($f)) + 36|0);
 HEAP32[$0>>2] = 6;
 $1 = HEAP32[$f>>2]|0;
 $2 = $1 & 64;
 $3 = ($2|0)==(0);
 if ($3) {
  $4 = ((($f)) + 60|0);
  $5 = HEAP32[$4>>2]|0;
  HEAP32[$vararg_buffer>>2] = $5;
  $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
  HEAP32[$vararg_ptr1>>2] = 21505;
  $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
  HEAP32[$vararg_ptr2>>2] = $tio;
  $6 = (___syscall54(54,($vararg_buffer|0))|0);
  $7 = ($6|0)==(0);
  if (!($7)) {
   $8 = ((($f)) + 75|0);
   HEAP8[$8>>0] = -1;
  }
 }
 $9 = (___stdio_write($f,$buf,$len)|0);
 STACKTOP = sp;return ($9|0);
}
function ___string_read($f,$buf,$len) {
 $f = $f|0;
 $buf = $buf|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $k$0 = 0, $k$0$len = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 84|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = (($len) + 256)|0;
 $3 = (_memchr($1,0,$2)|0);
 $4 = ($3|0)==(0|0);
 $5 = $3;
 $6 = $1;
 $7 = (($5) - ($6))|0;
 $k$0 = $4 ? $2 : $7;
 $8 = ($k$0>>>0)<($len>>>0);
 $k$0$len = $8 ? $k$0 : $len;
 _memcpy(($buf|0),($1|0),($k$0$len|0))|0;
 $9 = (($1) + ($k$0$len)|0);
 $10 = ((($f)) + 4|0);
 HEAP32[$10>>2] = $9;
 $11 = (($1) + ($k$0)|0);
 $12 = ((($f)) + 8|0);
 HEAP32[$12>>2] = $11;
 HEAP32[$0>>2] = $11;
 return ($k$0$len|0);
}
function ___toread($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $3 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 74|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = $1 << 24 >> 24;
 $3 = (($2) + 255)|0;
 $4 = $3 | $2;
 $5 = $4&255;
 HEAP8[$0>>0] = $5;
 $6 = ((($f)) + 20|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ((($f)) + 44|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($7>>>0)>($9>>>0);
 if ($10) {
  $11 = ((($f)) + 36|0);
  $12 = HEAP32[$11>>2]|0;
  (FUNCTION_TABLE_iiii[$12 & 7]($f,0,0)|0);
 }
 $13 = ((($f)) + 16|0);
 HEAP32[$13>>2] = 0;
 $14 = ((($f)) + 28|0);
 HEAP32[$14>>2] = 0;
 HEAP32[$6>>2] = 0;
 $15 = HEAP32[$f>>2]|0;
 $16 = $15 & 20;
 $17 = ($16|0)==(0);
 if ($17) {
  $21 = HEAP32[$8>>2]|0;
  $22 = ((($f)) + 8|0);
  HEAP32[$22>>2] = $21;
  $23 = ((($f)) + 4|0);
  HEAP32[$23>>2] = $21;
  $$0 = 0;
 } else {
  $18 = $15 & 4;
  $19 = ($18|0)==(0);
  if ($19) {
   $$0 = -1;
  } else {
   $20 = $15 | 32;
   HEAP32[$f>>2] = $20;
   $$0 = -1;
  }
 }
 return ($$0|0);
}
function ___towrite($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 74|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = $1 << 24 >> 24;
 $3 = (($2) + 255)|0;
 $4 = $3 | $2;
 $5 = $4&255;
 HEAP8[$0>>0] = $5;
 $6 = HEAP32[$f>>2]|0;
 $7 = $6 & 8;
 $8 = ($7|0)==(0);
 if ($8) {
  $10 = ((($f)) + 8|0);
  HEAP32[$10>>2] = 0;
  $11 = ((($f)) + 4|0);
  HEAP32[$11>>2] = 0;
  $12 = ((($f)) + 44|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = ((($f)) + 28|0);
  HEAP32[$14>>2] = $13;
  $15 = ((($f)) + 20|0);
  HEAP32[$15>>2] = $13;
  $16 = $13;
  $17 = ((($f)) + 48|0);
  $18 = HEAP32[$17>>2]|0;
  $19 = (($16) + ($18)|0);
  $20 = ((($f)) + 16|0);
  HEAP32[$20>>2] = $19;
  $$0 = 0;
 } else {
  $9 = $6 | 32;
  HEAP32[$f>>2] = $9;
  $$0 = -1;
 }
 return ($$0|0);
}
function ___uflow($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $c = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $c = sp;
 $0 = ((($f)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0|0);
 if ($2) {
  $3 = (___toread($f)|0);
  $4 = ($3|0)==(0);
  if ($4) {
   label = 3;
  } else {
   $$0 = -1;
  }
 } else {
  label = 3;
 }
 if ((label|0) == 3) {
  $5 = ((($f)) + 32|0);
  $6 = HEAP32[$5>>2]|0;
  $7 = (FUNCTION_TABLE_iiii[$6 & 7]($f,$c,1)|0);
  $8 = ($7|0)==(1);
  if ($8) {
   $9 = HEAP8[$c>>0]|0;
   $10 = $9&255;
   $$0 = $10;
  } else {
   $$0 = -1;
  }
 }
 STACKTOP = sp;return ($$0|0);
}
function _memchr($src,$c,$n) {
 $src = $src|0;
 $c = $c|0;
 $n = $n|0;
 var $$0$lcssa = 0, $$0$lcssa44 = 0, $$019 = 0, $$1$lcssa = 0, $$110 = 0, $$110$lcssa = 0, $$24 = 0, $$3 = 0, $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0;
 var $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond18 = 0, $s$0$lcssa = 0, $s$0$lcssa43 = 0, $s$020 = 0, $s$15 = 0, $s$2 = 0, $w$0$lcssa = 0, $w$011 = 0, $w$011$lcssa = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $c & 255;
 $1 = $src;
 $2 = $1 & 3;
 $3 = ($2|0)!=(0);
 $4 = ($n|0)!=(0);
 $or$cond18 = $4 & $3;
 L1: do {
  if ($or$cond18) {
   $5 = $c&255;
   $$019 = $n;$s$020 = $src;
   while(1) {
    $6 = HEAP8[$s$020>>0]|0;
    $7 = ($6<<24>>24)==($5<<24>>24);
    if ($7) {
     $$0$lcssa44 = $$019;$s$0$lcssa43 = $s$020;
     label = 6;
     break L1;
    }
    $8 = ((($s$020)) + 1|0);
    $9 = (($$019) + -1)|0;
    $10 = $8;
    $11 = $10 & 3;
    $12 = ($11|0)!=(0);
    $13 = ($9|0)!=(0);
    $or$cond = $13 & $12;
    if ($or$cond) {
     $$019 = $9;$s$020 = $8;
    } else {
     $$0$lcssa = $9;$$lcssa = $13;$s$0$lcssa = $8;
     label = 5;
     break;
    }
   }
  } else {
   $$0$lcssa = $n;$$lcssa = $4;$s$0$lcssa = $src;
   label = 5;
  }
 } while(0);
 if ((label|0) == 5) {
  if ($$lcssa) {
   $$0$lcssa44 = $$0$lcssa;$s$0$lcssa43 = $s$0$lcssa;
   label = 6;
  } else {
   $$3 = 0;$s$2 = $s$0$lcssa;
  }
 }
 L8: do {
  if ((label|0) == 6) {
   $14 = HEAP8[$s$0$lcssa43>>0]|0;
   $15 = $c&255;
   $16 = ($14<<24>>24)==($15<<24>>24);
   if ($16) {
    $$3 = $$0$lcssa44;$s$2 = $s$0$lcssa43;
   } else {
    $17 = Math_imul($0, 16843009)|0;
    $18 = ($$0$lcssa44>>>0)>(3);
    L11: do {
     if ($18) {
      $$110 = $$0$lcssa44;$w$011 = $s$0$lcssa43;
      while(1) {
       $19 = HEAP32[$w$011>>2]|0;
       $20 = $19 ^ $17;
       $21 = (($20) + -16843009)|0;
       $22 = $20 & -2139062144;
       $23 = $22 ^ -2139062144;
       $24 = $23 & $21;
       $25 = ($24|0)==(0);
       if (!($25)) {
        $$110$lcssa = $$110;$w$011$lcssa = $w$011;
        break;
       }
       $26 = ((($w$011)) + 4|0);
       $27 = (($$110) + -4)|0;
       $28 = ($27>>>0)>(3);
       if ($28) {
        $$110 = $27;$w$011 = $26;
       } else {
        $$1$lcssa = $27;$w$0$lcssa = $26;
        label = 11;
        break L11;
       }
      }
      $$24 = $$110$lcssa;$s$15 = $w$011$lcssa;
     } else {
      $$1$lcssa = $$0$lcssa44;$w$0$lcssa = $s$0$lcssa43;
      label = 11;
     }
    } while(0);
    if ((label|0) == 11) {
     $29 = ($$1$lcssa|0)==(0);
     if ($29) {
      $$3 = 0;$s$2 = $w$0$lcssa;
      break;
     } else {
      $$24 = $$1$lcssa;$s$15 = $w$0$lcssa;
     }
    }
    while(1) {
     $30 = HEAP8[$s$15>>0]|0;
     $31 = ($30<<24>>24)==($15<<24>>24);
     if ($31) {
      $$3 = $$24;$s$2 = $s$15;
      break L8;
     }
     $32 = ((($s$15)) + 1|0);
     $33 = (($$24) + -1)|0;
     $34 = ($33|0)==(0);
     if ($34) {
      $$3 = 0;$s$2 = $32;
      break;
     } else {
      $$24 = $33;$s$15 = $32;
     }
    }
   }
  }
 } while(0);
 $35 = ($$3|0)!=(0);
 $36 = $35 ? $s$2 : 0;
 return ($36|0);
}
function _memcmp($vl,$vr,$n) {
 $vl = $vl|0;
 $vr = $vr|0;
 $n = $n|0;
 var $$03 = 0, $$lcssa = 0, $$lcssa19 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $l$04 = 0, $r$05 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n|0)==(0);
 L1: do {
  if ($0) {
   $11 = 0;
  } else {
   $$03 = $n;$l$04 = $vl;$r$05 = $vr;
   while(1) {
    $1 = HEAP8[$l$04>>0]|0;
    $2 = HEAP8[$r$05>>0]|0;
    $3 = ($1<<24>>24)==($2<<24>>24);
    if (!($3)) {
     $$lcssa = $1;$$lcssa19 = $2;
     break;
    }
    $4 = (($$03) + -1)|0;
    $5 = ((($l$04)) + 1|0);
    $6 = ((($r$05)) + 1|0);
    $7 = ($4|0)==(0);
    if ($7) {
     $11 = 0;
     break L1;
    } else {
     $$03 = $4;$l$04 = $5;$r$05 = $6;
    }
   }
   $8 = $$lcssa&255;
   $9 = $$lcssa19&255;
   $10 = (($8) - ($9))|0;
   $11 = $10;
  }
 } while(0);
 return ($11|0);
}
function ___stpcpy($d,$s) {
 $d = $d|0;
 $s = $s|0;
 var $$0$lcssa = 0, $$01$lcssa = 0, $$0115 = 0, $$016 = 0, $$03 = 0, $$1$ph = 0, $$12$ph = 0, $$128 = 0, $$19 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0;
 var $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $4 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, $wd$0$lcssa = 0, $wd$010 = 0, $ws$0$lcssa = 0, $ws$011 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $s;
 $1 = $d;
 $2 = $0 ^ $1;
 $3 = $2 & 3;
 $4 = ($3|0)==(0);
 L1: do {
  if ($4) {
   $5 = $0 & 3;
   $6 = ($5|0)==(0);
   if ($6) {
    $$0$lcssa = $s;$$01$lcssa = $d;
   } else {
    $$0115 = $d;$$016 = $s;
    while(1) {
     $7 = HEAP8[$$016>>0]|0;
     HEAP8[$$0115>>0] = $7;
     $8 = ($7<<24>>24)==(0);
     if ($8) {
      $$03 = $$0115;
      break L1;
     }
     $9 = ((($$016)) + 1|0);
     $10 = ((($$0115)) + 1|0);
     $11 = $9;
     $12 = $11 & 3;
     $13 = ($12|0)==(0);
     if ($13) {
      $$0$lcssa = $9;$$01$lcssa = $10;
      break;
     } else {
      $$0115 = $10;$$016 = $9;
     }
    }
   }
   $14 = HEAP32[$$0$lcssa>>2]|0;
   $15 = (($14) + -16843009)|0;
   $16 = $14 & -2139062144;
   $17 = $16 ^ -2139062144;
   $18 = $17 & $15;
   $19 = ($18|0)==(0);
   if ($19) {
    $22 = $14;$wd$010 = $$01$lcssa;$ws$011 = $$0$lcssa;
    while(1) {
     $20 = ((($ws$011)) + 4|0);
     $21 = ((($wd$010)) + 4|0);
     HEAP32[$wd$010>>2] = $22;
     $23 = HEAP32[$20>>2]|0;
     $24 = (($23) + -16843009)|0;
     $25 = $23 & -2139062144;
     $26 = $25 ^ -2139062144;
     $27 = $26 & $24;
     $28 = ($27|0)==(0);
     if ($28) {
      $22 = $23;$wd$010 = $21;$ws$011 = $20;
     } else {
      $wd$0$lcssa = $21;$ws$0$lcssa = $20;
      break;
     }
    }
   } else {
    $wd$0$lcssa = $$01$lcssa;$ws$0$lcssa = $$0$lcssa;
   }
   $$1$ph = $ws$0$lcssa;$$12$ph = $wd$0$lcssa;
   label = 8;
  } else {
   $$1$ph = $s;$$12$ph = $d;
   label = 8;
  }
 } while(0);
 if ((label|0) == 8) {
  $29 = HEAP8[$$1$ph>>0]|0;
  HEAP8[$$12$ph>>0] = $29;
  $30 = ($29<<24>>24)==(0);
  if ($30) {
   $$03 = $$12$ph;
  } else {
   $$128 = $$12$ph;$$19 = $$1$ph;
   while(1) {
    $31 = ((($$19)) + 1|0);
    $32 = ((($$128)) + 1|0);
    $33 = HEAP8[$31>>0]|0;
    HEAP8[$32>>0] = $33;
    $34 = ($33<<24>>24)==(0);
    if ($34) {
     $$03 = $32;
     break;
    } else {
     $$128 = $32;$$19 = $31;
    }
   }
  }
 }
 return ($$03|0);
}
function _strcasecmp($_l,$_r) {
 $_l = $_l|0;
 $_r = $_r|0;
 var $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $3 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $l$03 = 0, $l$03$lcssa24 = 0, $r$0$lcssa = 0, $r$04 = 0, $r$04$lcssa23 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$_l>>0]|0;
 $1 = ($0<<24>>24)==(0);
 L1: do {
  if ($1) {
   $19 = 0;$r$0$lcssa = $_r;
  } else {
   $2 = $0&255;
   $5 = $0;$7 = $2;$l$03 = $_l;$r$04 = $_r;
   while(1) {
    $3 = HEAP8[$r$04>>0]|0;
    $4 = ($3<<24>>24)==(0);
    if ($4) {
     $19 = $5;$r$0$lcssa = $r$04;
     break L1;
    }
    $6 = ($5<<24>>24)==($3<<24>>24);
    if (!($6)) {
     $8 = (_tolower($7)|0);
     $9 = HEAP8[$r$04>>0]|0;
     $10 = $9&255;
     $11 = (_tolower($10)|0);
     $12 = ($8|0)==($11|0);
     if (!($12)) {
      $l$03$lcssa24 = $l$03;$r$04$lcssa23 = $r$04;
      break;
     }
    }
    $13 = ((($l$03)) + 1|0);
    $14 = ((($r$04)) + 1|0);
    $15 = HEAP8[$13>>0]|0;
    $16 = $15&255;
    $17 = ($15<<24>>24)==(0);
    if ($17) {
     $19 = 0;$r$0$lcssa = $14;
     break L1;
    } else {
     $5 = $15;$7 = $16;$l$03 = $13;$r$04 = $14;
    }
   }
   $$pre = HEAP8[$l$03$lcssa24>>0]|0;
   $19 = $$pre;$r$0$lcssa = $r$04$lcssa23;
  }
 } while(0);
 $18 = $19&255;
 $20 = (_tolower($18)|0);
 $21 = HEAP8[$r$0$lcssa>>0]|0;
 $22 = $21&255;
 $23 = (_tolower($22)|0);
 $24 = (($20) - ($23))|0;
 return ($24|0);
}
function _strcat($dest,$src) {
 $dest = $dest|0;
 $src = $src|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_strlen($dest)|0);
 $1 = (($dest) + ($0)|0);
 (_strcpy($1,$src)|0);
 return ($dest|0);
}
function _strchr($s,$c) {
 $s = $s|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___strchrnul($s,$c)|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = $c&255;
 $3 = ($1<<24>>24)==($2<<24>>24);
 $4 = $3 ? $0 : 0;
 return ($4|0);
}
function ___strchrnul($s,$c) {
 $s = $s|0;
 $c = $c|0;
 var $$0 = 0, $$02$lcssa = 0, $$0211 = 0, $$1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond5 = 0, $w$0$lcssa = 0, $w$08 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $c & 255;
 $1 = ($0|0)==(0);
 L1: do {
  if ($1) {
   $6 = (_strlen($s)|0);
   $7 = (($s) + ($6)|0);
   $$0 = $7;
  } else {
   $2 = $s;
   $3 = $2 & 3;
   $4 = ($3|0)==(0);
   if ($4) {
    $$02$lcssa = $s;
   } else {
    $5 = $c&255;
    $$0211 = $s;
    while(1) {
     $8 = HEAP8[$$0211>>0]|0;
     $9 = ($8<<24>>24)==(0);
     $10 = ($8<<24>>24)==($5<<24>>24);
     $or$cond = $9 | $10;
     if ($or$cond) {
      $$0 = $$0211;
      break L1;
     }
     $11 = ((($$0211)) + 1|0);
     $12 = $11;
     $13 = $12 & 3;
     $14 = ($13|0)==(0);
     if ($14) {
      $$02$lcssa = $11;
      break;
     } else {
      $$0211 = $11;
     }
    }
   }
   $15 = Math_imul($0, 16843009)|0;
   $16 = HEAP32[$$02$lcssa>>2]|0;
   $17 = (($16) + -16843009)|0;
   $18 = $16 & -2139062144;
   $19 = $18 ^ -2139062144;
   $20 = $19 & $17;
   $21 = ($20|0)==(0);
   L10: do {
    if ($21) {
     $23 = $16;$w$08 = $$02$lcssa;
     while(1) {
      $22 = $23 ^ $15;
      $24 = (($22) + -16843009)|0;
      $25 = $22 & -2139062144;
      $26 = $25 ^ -2139062144;
      $27 = $26 & $24;
      $28 = ($27|0)==(0);
      if (!($28)) {
       $w$0$lcssa = $w$08;
       break L10;
      }
      $29 = ((($w$08)) + 4|0);
      $30 = HEAP32[$29>>2]|0;
      $31 = (($30) + -16843009)|0;
      $32 = $30 & -2139062144;
      $33 = $32 ^ -2139062144;
      $34 = $33 & $31;
      $35 = ($34|0)==(0);
      if ($35) {
       $23 = $30;$w$08 = $29;
      } else {
       $w$0$lcssa = $29;
       break;
      }
     }
    } else {
     $w$0$lcssa = $$02$lcssa;
    }
   } while(0);
   $36 = $c&255;
   $$1 = $w$0$lcssa;
   while(1) {
    $37 = HEAP8[$$1>>0]|0;
    $38 = ($37<<24>>24)==(0);
    $39 = ($37<<24>>24)==($36<<24>>24);
    $or$cond5 = $38 | $39;
    $40 = ((($$1)) + 1|0);
    if ($or$cond5) {
     $$0 = $$1;
     break;
    } else {
     $$1 = $40;
    }
   }
  }
 } while(0);
 return ($$0|0);
}
function _strcmp($l,$r) {
 $l = $l|0;
 $r = $r|0;
 var $$014 = 0, $$05 = 0, $$lcssa = 0, $$lcssa2 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond3 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$l>>0]|0;
 $1 = HEAP8[$r>>0]|0;
 $2 = ($0<<24>>24)!=($1<<24>>24);
 $3 = ($0<<24>>24)==(0);
 $or$cond3 = $3 | $2;
 if ($or$cond3) {
  $$lcssa = $0;$$lcssa2 = $1;
 } else {
  $$014 = $l;$$05 = $r;
  while(1) {
   $4 = ((($$014)) + 1|0);
   $5 = ((($$05)) + 1|0);
   $6 = HEAP8[$4>>0]|0;
   $7 = HEAP8[$5>>0]|0;
   $8 = ($6<<24>>24)!=($7<<24>>24);
   $9 = ($6<<24>>24)==(0);
   $or$cond = $9 | $8;
   if ($or$cond) {
    $$lcssa = $6;$$lcssa2 = $7;
    break;
   } else {
    $$014 = $4;$$05 = $5;
   }
  }
 }
 $10 = $$lcssa&255;
 $11 = $$lcssa2&255;
 $12 = (($10) - ($11))|0;
 return ($12|0);
}
function _strcpy($dest,$src) {
 $dest = $dest|0;
 $src = $src|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 (___stpcpy($dest,$src)|0);
 return ($dest|0);
}
function ___strdup($s) {
 $s = $s|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_strlen($s)|0);
 $1 = (($0) + 1)|0;
 $2 = (_malloc($1)|0);
 $3 = ($2|0)==(0|0);
 if ($3) {
  $$0 = 0;
 } else {
  _memcpy(($2|0),($s|0),($1|0))|0;
  $$0 = $2;
 }
 return ($$0|0);
}
function _strlen($s) {
 $s = $s|0;
 var $$0 = 0, $$01$lcssa = 0, $$014 = 0, $$1$lcssa = 0, $$lcssa20 = 0, $$pn = 0, $$pn15 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0;
 var $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $w$0 = 0, $w$0$lcssa = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $s;
 $1 = $0 & 3;
 $2 = ($1|0)==(0);
 L1: do {
  if ($2) {
   $$01$lcssa = $s;
   label = 4;
  } else {
   $$014 = $s;$21 = $0;
   while(1) {
    $3 = HEAP8[$$014>>0]|0;
    $4 = ($3<<24>>24)==(0);
    if ($4) {
     $$pn = $21;
     break L1;
    }
    $5 = ((($$014)) + 1|0);
    $6 = $5;
    $7 = $6 & 3;
    $8 = ($7|0)==(0);
    if ($8) {
     $$01$lcssa = $5;
     label = 4;
     break;
    } else {
     $$014 = $5;$21 = $6;
    }
   }
  }
 } while(0);
 if ((label|0) == 4) {
  $w$0 = $$01$lcssa;
  while(1) {
   $9 = HEAP32[$w$0>>2]|0;
   $10 = (($9) + -16843009)|0;
   $11 = $9 & -2139062144;
   $12 = $11 ^ -2139062144;
   $13 = $12 & $10;
   $14 = ($13|0)==(0);
   $15 = ((($w$0)) + 4|0);
   if ($14) {
    $w$0 = $15;
   } else {
    $$lcssa20 = $9;$w$0$lcssa = $w$0;
    break;
   }
  }
  $16 = $$lcssa20&255;
  $17 = ($16<<24>>24)==(0);
  if ($17) {
   $$1$lcssa = $w$0$lcssa;
  } else {
   $$pn15 = $w$0$lcssa;
   while(1) {
    $18 = ((($$pn15)) + 1|0);
    $$pre = HEAP8[$18>>0]|0;
    $19 = ($$pre<<24>>24)==(0);
    if ($19) {
     $$1$lcssa = $18;
     break;
    } else {
     $$pn15 = $18;
    }
   }
  }
  $20 = $$1$lcssa;
  $$pn = $20;
 }
 $$0 = (($$pn) - ($0))|0;
 return ($$0|0);
}
function _strncasecmp($_l,$_r,$n) {
 $_l = $_l|0;
 $_r = $_r|0;
 $n = $n|0;
 var $$04 = 0, $$08 = 0, $$08$in = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $l$06 = 0, $l$06$lcssa28 = 0, $or$cond = 0, $r$0$lcssa = 0, $r$07 = 0, $r$07$lcssa27 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n|0)==(0);
 if ($0) {
  $$04 = 0;
 } else {
  $1 = HEAP8[$_l>>0]|0;
  $2 = ($1<<24>>24)==(0);
  L3: do {
   if ($2) {
    $21 = 0;$r$0$lcssa = $_r;
   } else {
    $3 = $1&255;
    $$08$in = $n;$7 = $1;$9 = $3;$l$06 = $_l;$r$07 = $_r;
    while(1) {
     $$08 = (($$08$in) + -1)|0;
     $4 = HEAP8[$r$07>>0]|0;
     $5 = ($4<<24>>24)!=(0);
     $6 = ($$08|0)!=(0);
     $or$cond = $6 & $5;
     if (!($or$cond)) {
      $21 = $7;$r$0$lcssa = $r$07;
      break L3;
     }
     $8 = ($7<<24>>24)==($4<<24>>24);
     if (!($8)) {
      $10 = (_tolower($9)|0);
      $11 = HEAP8[$r$07>>0]|0;
      $12 = $11&255;
      $13 = (_tolower($12)|0);
      $14 = ($10|0)==($13|0);
      if (!($14)) {
       $l$06$lcssa28 = $l$06;$r$07$lcssa27 = $r$07;
       break;
      }
     }
     $15 = ((($l$06)) + 1|0);
     $16 = ((($r$07)) + 1|0);
     $17 = HEAP8[$15>>0]|0;
     $18 = $17&255;
     $19 = ($17<<24>>24)==(0);
     if ($19) {
      $21 = 0;$r$0$lcssa = $16;
      break L3;
     } else {
      $$08$in = $$08;$7 = $17;$9 = $18;$l$06 = $15;$r$07 = $16;
     }
    }
    $$pre = HEAP8[$l$06$lcssa28>>0]|0;
    $21 = $$pre;$r$0$lcssa = $r$07$lcssa27;
   }
  } while(0);
  $20 = $21&255;
  $22 = (_tolower($20)|0);
  $23 = HEAP8[$r$0$lcssa>>0]|0;
  $24 = $23&255;
  $25 = (_tolower($24)|0);
  $26 = (($22) - ($25))|0;
  $$04 = $26;
 }
 return ($$04|0);
}
function _strstr($h,$n) {
 $h = $h|0;
 $n = $n|0;
 var $$0 = 0, $$0$i = 0, $$0$lcssa$i = 0, $$0$lcssa$i11 = 0, $$01$i = 0, $$02$i = 0, $$02$i7 = 0, $$03$i = 0, $$lcssa$i = 0, $$lcssa$i10 = 0, $$lcssa$i4 = 0, $$lcssa281 = 0, $$lcssa284 = 0, $$lcssa287 = 0, $$lcssa301 = 0, $$lcssa304 = 0, $$lcssa307 = 0, $$lcssa322 = 0, $$pr$i = 0, $0 = 0;
 var $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0;
 var $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0;
 var $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0;
 var $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0;
 var $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0;
 var $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0;
 var $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0;
 var $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $233$phi = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0;
 var $byteset$i = 0, $div$i = 0, $div4$i = 0, $hw$0$in2$i = 0, $hw$03$i = 0, $hw$03$i6 = 0, $ip$0$ph$lcssa$i = 0, $ip$0$ph$lcssa143$i = 0, $ip$0$ph76$i = 0, $ip$1$ip$0$$i = 0, $ip$1$ip$0$i = 0, $ip$1$ph$lcssa$i = 0, $ip$1$ph55$i = 0, $jp$0$ph13$ph70$i = 0, $jp$0$ph1365$i = 0, $jp$0$ph1365$i$lcssa = 0, $jp$0$ph1365$i$lcssa$lcssa = 0, $jp$0$ph77$i = 0, $jp$1$ph56$i = 0, $jp$1$ph9$ph49$i = 0;
 var $jp$1$ph944$i = 0, $jp$1$ph944$i$lcssa = 0, $jp$1$ph944$i$lcssa$lcssa = 0, $k$059$i = 0, $k$139$i = 0, $k$2$i = 0, $k$338$i = 0, $k$338$i$lcssa = 0, $k$4$i = 0, $l$080$i = 0, $l$080$i$lcssa321 = 0, $mem$0$i = 0, $mem0$0$i = 0, $or$cond$i = 0, $or$cond$i2 = 0, $or$cond$i8 = 0, $or$cond5$i = 0, $p$0$ph$ph$lcssa32$i = 0, $p$0$ph$ph$lcssa32147$i = 0, $p$0$ph$ph71$i = 0;
 var $p$1$p$0$i = 0, $p$1$ph$ph$lcssa23$i = 0, $p$1$ph$ph50$i = 0, $p$3$i = 0, $shift$i = 0, $z$0$i = 0, $z$1$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1056|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $byteset$i = sp + 1024|0;
 $shift$i = sp;
 $0 = HEAP8[$n>>0]|0;
 $1 = ($0<<24>>24)==(0);
 do {
  if ($1) {
   $$0 = $h;
  } else {
   $2 = $0 << 24 >> 24;
   $3 = (_strchr($h,$2)|0);
   $4 = ($3|0)==(0|0);
   if ($4) {
    $$0 = 0;
   } else {
    $5 = ((($n)) + 1|0);
    $6 = HEAP8[$5>>0]|0;
    $7 = ($6<<24>>24)==(0);
    if ($7) {
     $$0 = $3;
    } else {
     $8 = ((($3)) + 1|0);
     $9 = HEAP8[$8>>0]|0;
     $10 = ($9<<24>>24)==(0);
     if ($10) {
      $$0 = 0;
     } else {
      $11 = ((($n)) + 2|0);
      $12 = HEAP8[$11>>0]|0;
      $13 = ($12<<24>>24)==(0);
      if ($13) {
       $14 = $0&255;
       $15 = $14 << 8;
       $16 = $6&255;
       $17 = $16 | $15;
       $18 = HEAP8[$3>>0]|0;
       $19 = $18&255;
       $20 = $19 << 8;
       $21 = $9&255;
       $22 = $20 | $21;
       $$01$i = $8;$232 = $9;$233 = $3;$hw$0$in2$i = $22;
       while(1) {
        $23 = $hw$0$in2$i & 65535;
        $24 = ($23|0)==($17|0);
        if ($24) {
         $$lcssa$i = $233;$31 = $232;
         break;
        }
        $25 = $23 << 8;
        $26 = ((($$01$i)) + 1|0);
        $27 = HEAP8[$26>>0]|0;
        $28 = $27&255;
        $29 = $28 | $25;
        $30 = ($27<<24>>24)==(0);
        if ($30) {
         $$lcssa$i = $$01$i;$31 = 0;
         break;
        } else {
         $233$phi = $$01$i;$$01$i = $26;$232 = $27;$hw$0$in2$i = $29;$233 = $233$phi;
        }
       }
       $32 = ($31<<24>>24)!=(0);
       $33 = $32 ? $$lcssa$i : 0;
       $$0 = $33;
       break;
      }
      $34 = ((($3)) + 2|0);
      $35 = HEAP8[$34>>0]|0;
      $36 = ($35<<24>>24)==(0);
      if ($36) {
       $$0 = 0;
      } else {
       $37 = ((($n)) + 3|0);
       $38 = HEAP8[$37>>0]|0;
       $39 = ($38<<24>>24)==(0);
       if ($39) {
        $40 = $0&255;
        $41 = $40 << 24;
        $42 = $6&255;
        $43 = $42 << 16;
        $44 = $43 | $41;
        $45 = $12&255;
        $46 = $45 << 8;
        $47 = $44 | $46;
        $48 = HEAP8[$3>>0]|0;
        $49 = $48&255;
        $50 = $49 << 24;
        $51 = $9&255;
        $52 = $51 << 16;
        $53 = $35&255;
        $54 = $53 << 8;
        $55 = $54 | $52;
        $56 = $55 | $50;
        $57 = ($56|0)==($47|0);
        if ($57) {
         $$0$lcssa$i = $34;$$lcssa$i4 = $35;
        } else {
         $$02$i = $34;$hw$03$i = $56;
         while(1) {
          $58 = ((($$02$i)) + 1|0);
          $59 = HEAP8[$58>>0]|0;
          $60 = $59&255;
          $61 = $60 | $hw$03$i;
          $62 = $61 << 8;
          $63 = ($59<<24>>24)==(0);
          $64 = ($62|0)==($47|0);
          $or$cond$i2 = $63 | $64;
          if ($or$cond$i2) {
           $$0$lcssa$i = $58;$$lcssa$i4 = $59;
           break;
          } else {
           $$02$i = $58;$hw$03$i = $62;
          }
         }
        }
        $65 = ($$lcssa$i4<<24>>24)!=(0);
        $66 = ((($$0$lcssa$i)) + -2|0);
        $67 = $65 ? $66 : 0;
        $$0 = $67;
        break;
       }
       $68 = ((($3)) + 3|0);
       $69 = HEAP8[$68>>0]|0;
       $70 = ($69<<24>>24)==(0);
       if ($70) {
        $$0 = 0;
       } else {
        $71 = ((($n)) + 4|0);
        $72 = HEAP8[$71>>0]|0;
        $73 = ($72<<24>>24)==(0);
        if ($73) {
         $74 = $0&255;
         $75 = $74 << 24;
         $76 = $6&255;
         $77 = $76 << 16;
         $78 = $77 | $75;
         $79 = $12&255;
         $80 = $79 << 8;
         $81 = $78 | $80;
         $82 = $38&255;
         $83 = $81 | $82;
         $84 = HEAP8[$3>>0]|0;
         $85 = $84&255;
         $86 = $85 << 24;
         $87 = $9&255;
         $88 = $87 << 16;
         $89 = $35&255;
         $90 = $89 << 8;
         $91 = $69&255;
         $92 = $90 | $88;
         $93 = $92 | $91;
         $94 = $93 | $86;
         $95 = ($94|0)==($83|0);
         if ($95) {
          $$0$lcssa$i11 = $68;$$lcssa$i10 = $69;
         } else {
          $$02$i7 = $68;$hw$03$i6 = $94;
          while(1) {
           $96 = $hw$03$i6 << 8;
           $97 = ((($$02$i7)) + 1|0);
           $98 = HEAP8[$97>>0]|0;
           $99 = $98&255;
           $100 = $99 | $96;
           $101 = ($98<<24>>24)==(0);
           $102 = ($100|0)==($83|0);
           $or$cond$i8 = $101 | $102;
           if ($or$cond$i8) {
            $$0$lcssa$i11 = $97;$$lcssa$i10 = $98;
            break;
           } else {
            $$02$i7 = $97;$hw$03$i6 = $100;
           }
          }
         }
         $103 = ($$lcssa$i10<<24>>24)!=(0);
         $104 = ((($$0$lcssa$i11)) + -3|0);
         $105 = $103 ? $104 : 0;
         $$0 = $105;
         break;
        }
        ;HEAP32[$byteset$i>>2]=0|0;HEAP32[$byteset$i+4>>2]=0|0;HEAP32[$byteset$i+8>>2]=0|0;HEAP32[$byteset$i+12>>2]=0|0;HEAP32[$byteset$i+16>>2]=0|0;HEAP32[$byteset$i+20>>2]=0|0;HEAP32[$byteset$i+24>>2]=0|0;HEAP32[$byteset$i+28>>2]=0|0;
        $110 = $0;$l$080$i = 0;
        while(1) {
         $106 = (($3) + ($l$080$i)|0);
         $107 = HEAP8[$106>>0]|0;
         $108 = ($107<<24>>24)==(0);
         if ($108) {
          $$0$i = 0;
          break;
         }
         $109 = $110 & 31;
         $111 = $109&255;
         $112 = 1 << $111;
         $div4$i = ($110&255) >>> 5;
         $113 = $div4$i&255;
         $114 = (($byteset$i) + ($113<<2)|0);
         $115 = HEAP32[$114>>2]|0;
         $116 = $115 | $112;
         HEAP32[$114>>2] = $116;
         $117 = (($l$080$i) + 1)|0;
         $118 = $110&255;
         $119 = (($shift$i) + ($118<<2)|0);
         HEAP32[$119>>2] = $117;
         $120 = (($n) + ($117)|0);
         $121 = HEAP8[$120>>0]|0;
         $122 = ($121<<24>>24)==(0);
         if ($122) {
          $$lcssa322 = $117;$l$080$i$lcssa321 = $l$080$i;
          label = 23;
          break;
         } else {
          $110 = $121;$l$080$i = $117;
         }
        }
        L32: do {
         if ((label|0) == 23) {
          $123 = ($$lcssa322>>>0)>(1);
          L34: do {
           if ($123) {
            $234 = 1;$ip$0$ph76$i = -1;$jp$0$ph77$i = 0;
            L35: while(1) {
             $235 = $234;$jp$0$ph13$ph70$i = $jp$0$ph77$i;$p$0$ph$ph71$i = 1;
             while(1) {
              $236 = $235;$jp$0$ph1365$i = $jp$0$ph13$ph70$i;
              L39: while(1) {
               $133 = $236;$k$059$i = 1;
               while(1) {
                $129 = (($k$059$i) + ($ip$0$ph76$i))|0;
                $130 = (($n) + ($129)|0);
                $131 = HEAP8[$130>>0]|0;
                $132 = (($n) + ($133)|0);
                $134 = HEAP8[$132>>0]|0;
                $135 = ($131<<24>>24)==($134<<24>>24);
                if (!($135)) {
                 $$lcssa301 = $133;$$lcssa304 = $131;$$lcssa307 = $134;$jp$0$ph1365$i$lcssa = $jp$0$ph1365$i;
                 break L39;
                }
                $136 = ($k$059$i|0)==($p$0$ph$ph71$i|0);
                $127 = (($k$059$i) + 1)|0;
                if ($136) {
                 break;
                }
                $126 = (($127) + ($jp$0$ph1365$i))|0;
                $128 = ($126>>>0)<($$lcssa322>>>0);
                if ($128) {
                 $133 = $126;$k$059$i = $127;
                } else {
                 $ip$0$ph$lcssa$i = $ip$0$ph76$i;$p$0$ph$ph$lcssa32$i = $p$0$ph$ph71$i;
                 break L35;
                }
               }
               $137 = (($jp$0$ph1365$i) + ($p$0$ph$ph71$i))|0;
               $138 = (($137) + 1)|0;
               $139 = ($138>>>0)<($$lcssa322>>>0);
               if ($139) {
                $236 = $138;$jp$0$ph1365$i = $137;
               } else {
                $ip$0$ph$lcssa$i = $ip$0$ph76$i;$p$0$ph$ph$lcssa32$i = $p$0$ph$ph71$i;
                break L35;
               }
              }
              $140 = ($$lcssa304&255)>($$lcssa307&255);
              $141 = (($$lcssa301) - ($ip$0$ph76$i))|0;
              if (!($140)) {
               $jp$0$ph1365$i$lcssa$lcssa = $jp$0$ph1365$i$lcssa;
               break;
              }
              $124 = (($$lcssa301) + 1)|0;
              $125 = ($124>>>0)<($$lcssa322>>>0);
              if ($125) {
               $235 = $124;$jp$0$ph13$ph70$i = $$lcssa301;$p$0$ph$ph71$i = $141;
              } else {
               $ip$0$ph$lcssa$i = $ip$0$ph76$i;$p$0$ph$ph$lcssa32$i = $141;
               break L35;
              }
             }
             $142 = (($jp$0$ph1365$i$lcssa$lcssa) + 1)|0;
             $143 = (($jp$0$ph1365$i$lcssa$lcssa) + 2)|0;
             $144 = ($143>>>0)<($$lcssa322>>>0);
             if ($144) {
              $234 = $143;$ip$0$ph76$i = $jp$0$ph1365$i$lcssa$lcssa;$jp$0$ph77$i = $142;
             } else {
              $ip$0$ph$lcssa$i = $jp$0$ph1365$i$lcssa$lcssa;$p$0$ph$ph$lcssa32$i = 1;
              break;
             }
            }
            $237 = 1;$ip$1$ph55$i = -1;$jp$1$ph56$i = 0;
            while(1) {
             $239 = $237;$jp$1$ph9$ph49$i = $jp$1$ph56$i;$p$1$ph$ph50$i = 1;
             while(1) {
              $238 = $239;$jp$1$ph944$i = $jp$1$ph9$ph49$i;
              L54: while(1) {
               $152 = $238;$k$139$i = 1;
               while(1) {
                $148 = (($k$139$i) + ($ip$1$ph55$i))|0;
                $149 = (($n) + ($148)|0);
                $150 = HEAP8[$149>>0]|0;
                $151 = (($n) + ($152)|0);
                $153 = HEAP8[$151>>0]|0;
                $154 = ($150<<24>>24)==($153<<24>>24);
                if (!($154)) {
                 $$lcssa281 = $152;$$lcssa284 = $150;$$lcssa287 = $153;$jp$1$ph944$i$lcssa = $jp$1$ph944$i;
                 break L54;
                }
                $155 = ($k$139$i|0)==($p$1$ph$ph50$i|0);
                $146 = (($k$139$i) + 1)|0;
                if ($155) {
                 break;
                }
                $145 = (($146) + ($jp$1$ph944$i))|0;
                $147 = ($145>>>0)<($$lcssa322>>>0);
                if ($147) {
                 $152 = $145;$k$139$i = $146;
                } else {
                 $ip$0$ph$lcssa143$i = $ip$0$ph$lcssa$i;$ip$1$ph$lcssa$i = $ip$1$ph55$i;$p$0$ph$ph$lcssa32147$i = $p$0$ph$ph$lcssa32$i;$p$1$ph$ph$lcssa23$i = $p$1$ph$ph50$i;
                 break L34;
                }
               }
               $156 = (($jp$1$ph944$i) + ($p$1$ph$ph50$i))|0;
               $157 = (($156) + 1)|0;
               $158 = ($157>>>0)<($$lcssa322>>>0);
               if ($158) {
                $238 = $157;$jp$1$ph944$i = $156;
               } else {
                $ip$0$ph$lcssa143$i = $ip$0$ph$lcssa$i;$ip$1$ph$lcssa$i = $ip$1$ph55$i;$p$0$ph$ph$lcssa32147$i = $p$0$ph$ph$lcssa32$i;$p$1$ph$ph$lcssa23$i = $p$1$ph$ph50$i;
                break L34;
               }
              }
              $159 = ($$lcssa284&255)<($$lcssa287&255);
              $160 = (($$lcssa281) - ($ip$1$ph55$i))|0;
              if (!($159)) {
               $jp$1$ph944$i$lcssa$lcssa = $jp$1$ph944$i$lcssa;
               break;
              }
              $164 = (($$lcssa281) + 1)|0;
              $165 = ($164>>>0)<($$lcssa322>>>0);
              if ($165) {
               $239 = $164;$jp$1$ph9$ph49$i = $$lcssa281;$p$1$ph$ph50$i = $160;
              } else {
               $ip$0$ph$lcssa143$i = $ip$0$ph$lcssa$i;$ip$1$ph$lcssa$i = $ip$1$ph55$i;$p$0$ph$ph$lcssa32147$i = $p$0$ph$ph$lcssa32$i;$p$1$ph$ph$lcssa23$i = $160;
               break L34;
              }
             }
             $161 = (($jp$1$ph944$i$lcssa$lcssa) + 1)|0;
             $162 = (($jp$1$ph944$i$lcssa$lcssa) + 2)|0;
             $163 = ($162>>>0)<($$lcssa322>>>0);
             if ($163) {
              $237 = $162;$ip$1$ph55$i = $jp$1$ph944$i$lcssa$lcssa;$jp$1$ph56$i = $161;
             } else {
              $ip$0$ph$lcssa143$i = $ip$0$ph$lcssa$i;$ip$1$ph$lcssa$i = $jp$1$ph944$i$lcssa$lcssa;$p$0$ph$ph$lcssa32147$i = $p$0$ph$ph$lcssa32$i;$p$1$ph$ph$lcssa23$i = 1;
              break;
             }
            }
           } else {
            $ip$0$ph$lcssa143$i = -1;$ip$1$ph$lcssa$i = -1;$p$0$ph$ph$lcssa32147$i = 1;$p$1$ph$ph$lcssa23$i = 1;
           }
          } while(0);
          $166 = (($ip$1$ph$lcssa$i) + 1)|0;
          $167 = (($ip$0$ph$lcssa143$i) + 1)|0;
          $168 = ($166>>>0)>($167>>>0);
          $p$1$p$0$i = $168 ? $p$1$ph$ph$lcssa23$i : $p$0$ph$ph$lcssa32147$i;
          $ip$1$ip$0$i = $168 ? $ip$1$ph$lcssa$i : $ip$0$ph$lcssa143$i;
          $169 = (($n) + ($p$1$p$0$i)|0);
          $170 = (($ip$1$ip$0$i) + 1)|0;
          $171 = (_memcmp($n,$169,$170)|0);
          $172 = ($171|0)==(0);
          if ($172) {
           $177 = (($$lcssa322) - ($p$1$p$0$i))|0;
           $mem0$0$i = $177;$p$3$i = $p$1$p$0$i;
          } else {
           $173 = (($$lcssa322) - ($ip$1$ip$0$i))|0;
           $174 = (($173) + -1)|0;
           $175 = ($ip$1$ip$0$i>>>0)>($174>>>0);
           $ip$1$ip$0$$i = $175 ? $ip$1$ip$0$i : $174;
           $176 = (($ip$1$ip$0$$i) + 1)|0;
           $mem0$0$i = 0;$p$3$i = $176;
          }
          $178 = $$lcssa322 | 63;
          $179 = ($mem0$0$i|0)!=(0);
          $180 = (($$lcssa322) - ($p$3$i))|0;
          $$03$i = $3;$mem$0$i = 0;$z$0$i = $3;
          L69: while(1) {
           $181 = $z$0$i;
           $182 = $$03$i;
           $183 = (($181) - ($182))|0;
           $184 = ($183>>>0)<($$lcssa322>>>0);
           do {
            if ($184) {
             $185 = (_memchr($z$0$i,0,$178)|0);
             $186 = ($185|0)==(0|0);
             if ($186) {
              $190 = (($z$0$i) + ($178)|0);
              $z$1$i = $190;
              break;
             } else {
              $187 = $185;
              $188 = (($187) - ($182))|0;
              $189 = ($188>>>0)<($$lcssa322>>>0);
              if ($189) {
               $$0$i = 0;
               break L32;
              } else {
               $z$1$i = $185;
               break;
              }
             }
            } else {
             $z$1$i = $z$0$i;
            }
           } while(0);
           $191 = (($$03$i) + ($l$080$i$lcssa321)|0);
           $192 = HEAP8[$191>>0]|0;
           $div$i = ($192&255) >>> 5;
           $193 = $div$i&255;
           $194 = (($byteset$i) + ($193<<2)|0);
           $195 = HEAP32[$194>>2]|0;
           $196 = $192 & 31;
           $197 = $196&255;
           $198 = 1 << $197;
           $199 = $198 & $195;
           $200 = ($199|0)==(0);
           if ($200) {
            $209 = (($$03$i) + ($$lcssa322)|0);
            $$03$i = $209;$mem$0$i = 0;$z$0$i = $z$1$i;
            continue;
           }
           $201 = $192&255;
           $202 = (($shift$i) + ($201<<2)|0);
           $203 = HEAP32[$202>>2]|0;
           $204 = (($$lcssa322) - ($203))|0;
           $205 = ($$lcssa322|0)==($203|0);
           if (!($205)) {
            $206 = ($mem$0$i|0)!=(0);
            $or$cond$i = $179 & $206;
            $207 = ($204>>>0)<($p$3$i>>>0);
            $or$cond5$i = $or$cond$i & $207;
            $k$2$i = $or$cond5$i ? $180 : $204;
            $208 = (($$03$i) + ($k$2$i)|0);
            $$03$i = $208;$mem$0$i = 0;$z$0$i = $z$1$i;
            continue;
           }
           $210 = ($170>>>0)>($mem$0$i>>>0);
           $211 = $210 ? $170 : $mem$0$i;
           $212 = (($n) + ($211)|0);
           $213 = HEAP8[$212>>0]|0;
           $214 = ($213<<24>>24)==(0);
           L83: do {
            if ($214) {
             $k$4$i = $170;
            } else {
             $$pr$i = $213;$k$338$i = $211;
             while(1) {
              $215 = (($$03$i) + ($k$338$i)|0);
              $216 = HEAP8[$215>>0]|0;
              $217 = ($$pr$i<<24>>24)==($216<<24>>24);
              if (!($217)) {
               $k$338$i$lcssa = $k$338$i;
               break;
              }
              $218 = (($k$338$i) + 1)|0;
              $219 = (($n) + ($218)|0);
              $220 = HEAP8[$219>>0]|0;
              $221 = ($220<<24>>24)==(0);
              if ($221) {
               $k$4$i = $170;
               break L83;
              } else {
               $$pr$i = $220;$k$338$i = $218;
              }
             }
             $222 = (($k$338$i$lcssa) - ($ip$1$ip$0$i))|0;
             $223 = (($$03$i) + ($222)|0);
             $$03$i = $223;$mem$0$i = 0;$z$0$i = $z$1$i;
             continue L69;
            }
           } while(0);
           while(1) {
            $224 = ($k$4$i>>>0)>($mem$0$i>>>0);
            if (!($224)) {
             $$0$i = $$03$i;
             break L32;
            }
            $225 = (($k$4$i) + -1)|0;
            $226 = (($n) + ($225)|0);
            $227 = HEAP8[$226>>0]|0;
            $228 = (($$03$i) + ($225)|0);
            $229 = HEAP8[$228>>0]|0;
            $230 = ($227<<24>>24)==($229<<24>>24);
            if ($230) {
             $k$4$i = $225;
            } else {
             break;
            }
           }
           $231 = (($$03$i) + ($p$3$i)|0);
           $$03$i = $231;$mem$0$i = $mem0$0$i;$z$0$i = $z$1$i;
          }
         }
        } while(0);
        $$0 = $$0$i;
       }
      }
     }
    }
   }
  }
 } while(0);
 STACKTOP = sp;return ($$0|0);
}
function _scanexp($f,$pok) {
 $f = $f|0;
 $pok = $pok|0;
 var $$lcssa22 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0;
 var $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0;
 var $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0;
 var $99 = 0, $c$0 = 0, $c$1$be = 0, $c$1$be$lcssa = 0, $c$112 = 0, $c$2$be = 0, $c$2$lcssa = 0, $c$27 = 0, $c$3$be = 0, $neg$0 = 0, $or$cond3 = 0, $x$013 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 4|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($f)) + 100|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($1>>>0)<($3>>>0);
 if ($4) {
  $5 = ((($1)) + 1|0);
  HEAP32[$0>>2] = $5;
  $6 = HEAP8[$1>>0]|0;
  $7 = $6&255;
  $9 = $7;
 } else {
  $8 = (___shgetc($f)|0);
  $9 = $8;
 }
 $10 = ($9|0)==(45);
 switch ($9|0) {
 case 43: case 45:  {
  $11 = $10&1;
  $12 = HEAP32[$0>>2]|0;
  $13 = HEAP32[$2>>2]|0;
  $14 = ($12>>>0)<($13>>>0);
  if ($14) {
   $15 = ((($12)) + 1|0);
   HEAP32[$0>>2] = $15;
   $16 = HEAP8[$12>>0]|0;
   $17 = $16&255;
   $20 = $17;
  } else {
   $18 = (___shgetc($f)|0);
   $20 = $18;
  }
  $19 = (($20) + -48)|0;
  $21 = ($19>>>0)>(9);
  $22 = ($pok|0)!=(0);
  $or$cond3 = $22 & $21;
  if ($or$cond3) {
   $23 = HEAP32[$2>>2]|0;
   $24 = ($23|0)==(0|0);
   if ($24) {
    $c$0 = $20;$neg$0 = $11;
   } else {
    $25 = HEAP32[$0>>2]|0;
    $26 = ((($25)) + -1|0);
    HEAP32[$0>>2] = $26;
    $c$0 = $20;$neg$0 = $11;
   }
  } else {
   $c$0 = $20;$neg$0 = $11;
  }
  break;
 }
 default: {
  $c$0 = $9;$neg$0 = 0;
 }
 }
 $27 = (($c$0) + -48)|0;
 $28 = ($27>>>0)>(9);
 if ($28) {
  $29 = HEAP32[$2>>2]|0;
  $30 = ($29|0)==(0|0);
  if ($30) {
   $98 = -2147483648;$99 = 0;
  } else {
   $31 = HEAP32[$0>>2]|0;
   $32 = ((($31)) + -1|0);
   HEAP32[$0>>2] = $32;
   $98 = -2147483648;$99 = 0;
  }
 } else {
  $c$112 = $c$0;$x$013 = 0;
  while(1) {
   $33 = ($x$013*10)|0;
   $34 = (($c$112) + -48)|0;
   $35 = (($34) + ($33))|0;
   $36 = HEAP32[$0>>2]|0;
   $37 = HEAP32[$2>>2]|0;
   $38 = ($36>>>0)<($37>>>0);
   if ($38) {
    $39 = ((($36)) + 1|0);
    HEAP32[$0>>2] = $39;
    $40 = HEAP8[$36>>0]|0;
    $41 = $40&255;
    $c$1$be = $41;
   } else {
    $42 = (___shgetc($f)|0);
    $c$1$be = $42;
   }
   $43 = (($c$1$be) + -48)|0;
   $44 = ($43>>>0)<(10);
   $45 = ($35|0)<(214748364);
   $46 = $44 & $45;
   if ($46) {
    $c$112 = $c$1$be;$x$013 = $35;
   } else {
    $$lcssa22 = $35;$c$1$be$lcssa = $c$1$be;
    break;
   }
  }
  $47 = ($$lcssa22|0)<(0);
  $48 = $47 << 31 >> 31;
  $49 = (($c$1$be$lcssa) + -48)|0;
  $50 = ($49>>>0)<(10);
  if ($50) {
   $53 = $$lcssa22;$54 = $48;$c$27 = $c$1$be$lcssa;
   while(1) {
    $55 = (___muldi3(($53|0),($54|0),10,0)|0);
    $56 = tempRet0;
    $57 = ($c$27|0)<(0);
    $58 = $57 << 31 >> 31;
    $59 = (_i64Add(($c$27|0),($58|0),-48,-1)|0);
    $60 = tempRet0;
    $61 = (_i64Add(($59|0),($60|0),($55|0),($56|0))|0);
    $62 = tempRet0;
    $63 = HEAP32[$0>>2]|0;
    $64 = HEAP32[$2>>2]|0;
    $65 = ($63>>>0)<($64>>>0);
    if ($65) {
     $66 = ((($63)) + 1|0);
     HEAP32[$0>>2] = $66;
     $67 = HEAP8[$63>>0]|0;
     $68 = $67&255;
     $c$2$be = $68;
    } else {
     $69 = (___shgetc($f)|0);
     $c$2$be = $69;
    }
    $70 = (($c$2$be) + -48)|0;
    $71 = ($70>>>0)<(10);
    $72 = ($62|0)<(21474836);
    $73 = ($61>>>0)<(2061584302);
    $74 = ($62|0)==(21474836);
    $75 = $74 & $73;
    $76 = $72 | $75;
    $77 = $71 & $76;
    if ($77) {
     $53 = $61;$54 = $62;$c$27 = $c$2$be;
    } else {
     $92 = $61;$93 = $62;$c$2$lcssa = $c$2$be;
     break;
    }
   }
  } else {
   $92 = $$lcssa22;$93 = $48;$c$2$lcssa = $c$1$be$lcssa;
  }
  $51 = (($c$2$lcssa) + -48)|0;
  $52 = ($51>>>0)<(10);
  if ($52) {
   while(1) {
    $78 = HEAP32[$0>>2]|0;
    $79 = HEAP32[$2>>2]|0;
    $80 = ($78>>>0)<($79>>>0);
    if ($80) {
     $81 = ((($78)) + 1|0);
     HEAP32[$0>>2] = $81;
     $82 = HEAP8[$78>>0]|0;
     $83 = $82&255;
     $c$3$be = $83;
    } else {
     $84 = (___shgetc($f)|0);
     $c$3$be = $84;
    }
    $85 = (($c$3$be) + -48)|0;
    $86 = ($85>>>0)<(10);
    if (!($86)) {
     break;
    }
   }
  }
  $87 = HEAP32[$2>>2]|0;
  $88 = ($87|0)==(0|0);
  if (!($88)) {
   $89 = HEAP32[$0>>2]|0;
   $90 = ((($89)) + -1|0);
   HEAP32[$0>>2] = $90;
  }
  $91 = ($neg$0|0)!=(0);
  $94 = (_i64Subtract(0,0,($92|0),($93|0))|0);
  $95 = tempRet0;
  $96 = $91 ? $94 : $92;
  $97 = $91 ? $95 : $93;
  $98 = $97;$99 = $96;
 }
 tempRet0 = ($98);
 return ($99|0);
}
function ___fflush_unlocked($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 20|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($f)) + 28|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($1>>>0)>($3>>>0);
 if ($4) {
  $5 = ((($f)) + 36|0);
  $6 = HEAP32[$5>>2]|0;
  (FUNCTION_TABLE_iiii[$6 & 7]($f,0,0)|0);
  $7 = HEAP32[$0>>2]|0;
  $8 = ($7|0)==(0|0);
  if ($8) {
   $$0 = -1;
  } else {
   label = 3;
  }
 } else {
  label = 3;
 }
 if ((label|0) == 3) {
  $9 = ((($f)) + 4|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = ((($f)) + 8|0);
  $12 = HEAP32[$11>>2]|0;
  $13 = ($10>>>0)<($12>>>0);
  if ($13) {
   $14 = ((($f)) + 40|0);
   $15 = HEAP32[$14>>2]|0;
   $16 = $10;
   $17 = $12;
   $18 = (($16) - ($17))|0;
   (FUNCTION_TABLE_iiii[$15 & 7]($f,$18,1)|0);
  }
  $19 = ((($f)) + 16|0);
  HEAP32[$19>>2] = 0;
  HEAP32[$2>>2] = 0;
  HEAP32[$0>>2] = 0;
  HEAP32[$11>>2] = 0;
  HEAP32[$9>>2] = 0;
  $$0 = 0;
 }
 return ($$0|0);
}
function _printf_core($f,$fmt,$ap,$nl_arg,$nl_type) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 $nl_arg = $nl_arg|0;
 $nl_type = $nl_type|0;
 var $$ = 0, $$$i = 0, $$0 = 0, $$0$i = 0, $$0$lcssa$i = 0, $$012$i = 0, $$013$i = 0, $$03$i33 = 0, $$07$i = 0.0, $$1$i = 0.0, $$114$i = 0, $$2$i = 0.0, $$20$i = 0.0, $$21$i = 0, $$210$$22$i = 0, $$210$$24$i = 0, $$210$i = 0, $$23$i = 0, $$3$i = 0.0, $$31$i = 0;
 var $$311$i = 0, $$4$i = 0.0, $$412$lcssa$i = 0, $$41276$i = 0, $$5$lcssa$i = 0, $$51 = 0, $$587$i = 0, $$a$3$i = 0, $$a$3185$i = 0, $$a$3186$i = 0, $$fl$4 = 0, $$l10n$0 = 0, $$lcssa = 0, $$lcssa159$i = 0, $$lcssa318 = 0, $$lcssa323 = 0, $$lcssa324 = 0, $$lcssa325 = 0, $$lcssa326 = 0, $$lcssa327 = 0;
 var $$lcssa329 = 0, $$lcssa339 = 0, $$lcssa342 = 0.0, $$lcssa344 = 0, $$neg52$i = 0, $$neg53$i = 0, $$p$$i = 0, $$p$0 = 0, $$p$5 = 0, $$p$i = 0, $$pn$i = 0, $$pr$i = 0, $$pr47$i = 0, $$pre = 0, $$pre$i = 0, $$pre$phi184$iZ2D = 0, $$pre179$i = 0, $$pre182$i = 0, $$pre183$i = 0, $$pre193 = 0;
 var $$sum$i = 0, $$sum15$i = 0, $$sum16$i = 0, $$z$3$i = 0, $$z$4$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0;
 var $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0;
 var $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0;
 var $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0;
 var $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0;
 var $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0;
 var $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0;
 var $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0;
 var $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0;
 var $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0;
 var $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0;
 var $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0;
 var $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0;
 var $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0;
 var $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0.0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0.0;
 var $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0;
 var $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0.0, $392 = 0.0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0;
 var $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0.0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0.0, $412 = 0.0, $413 = 0.0, $414 = 0.0, $415 = 0.0, $416 = 0.0, $417 = 0;
 var $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0;
 var $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0.0, $443 = 0.0, $444 = 0.0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0;
 var $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0;
 var $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0.0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0.0, $486 = 0.0, $487 = 0.0, $488 = 0, $489 = 0, $49 = 0;
 var $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0;
 var $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0;
 var $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0;
 var $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0;
 var $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0;
 var $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0.0, $597 = 0.0, $598 = 0;
 var $599 = 0.0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0;
 var $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0;
 var $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0;
 var $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0;
 var $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0;
 var $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0;
 var $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0;
 var $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0;
 var $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0;
 var $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0;
 var $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0;
 var $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0;
 var $98 = 0, $99 = 0, $a$0 = 0, $a$1 = 0, $a$1$lcssa$i = 0, $a$1147$i = 0, $a$2 = 0, $a$2$ph$i = 0, $a$3$lcssa$i = 0, $a$3134$i = 0, $a$5$lcssa$i = 0, $a$5109$i = 0, $a$6$i = 0, $a$7$i = 0, $a$8$ph$i = 0, $arg = 0, $arglist_current = 0, $arglist_current2 = 0, $arglist_next = 0, $arglist_next3 = 0;
 var $argpos$0 = 0, $big$i = 0, $buf = 0, $buf$i = 0, $carry$0140$i = 0, $carry3$0128$i = 0, $cnt$0 = 0, $cnt$1 = 0, $cnt$1$lcssa = 0, $d$0$i = 0, $d$0139$i = 0, $d$0141$i = 0, $d$1127$i = 0, $d$2$lcssa$i = 0, $d$2108$i = 0, $d$3$i = 0, $d$482$i = 0, $d$575$i = 0, $d$686$i = 0, $e$0123$i = 0;
 var $e$1$i = 0, $e$2104$i = 0, $e$3$i = 0, $e$4$ph$i = 0, $e2$i = 0, $ebuf0$i = 0, $estr$0$i = 0, $estr$1$lcssa$i = 0, $estr$193$i = 0, $estr$2$i = 0, $exitcond$i = 0, $expanded = 0, $expanded10 = 0, $expanded11 = 0, $expanded13 = 0, $expanded14 = 0, $expanded15 = 0, $expanded4 = 0, $expanded6 = 0, $expanded7 = 0;
 var $expanded8 = 0, $fl$0109 = 0, $fl$062 = 0, $fl$1 = 0, $fl$1$ = 0, $fl$3 = 0, $fl$4 = 0, $fl$6 = 0, $fmt39$lcssa = 0, $fmt39101 = 0, $fmt40 = 0, $fmt41 = 0, $fmt42 = 0, $fmt44 = 0, $fmt44$lcssa321 = 0, $fmt45 = 0, $i$0$lcssa = 0, $i$0$lcssa200 = 0, $i$0114 = 0, $i$0122$i = 0;
 var $i$03$i = 0, $i$03$i25 = 0, $i$1$lcssa$i = 0, $i$1116$i = 0, $i$1125 = 0, $i$2100 = 0, $i$2100$lcssa = 0, $i$2103$i = 0, $i$398 = 0, $i$399$i = 0, $isdigit = 0, $isdigit$i = 0, $isdigit$i27 = 0, $isdigit10 = 0, $isdigit12 = 0, $isdigit2$i = 0, $isdigit2$i23 = 0, $isdigittmp = 0, $isdigittmp$ = 0, $isdigittmp$i = 0;
 var $isdigittmp$i26 = 0, $isdigittmp1$i = 0, $isdigittmp1$i22 = 0, $isdigittmp11 = 0, $isdigittmp4$i = 0, $isdigittmp4$i24 = 0, $isdigittmp9 = 0, $j$0$i = 0, $j$0115$i = 0, $j$0117$i = 0, $j$1100$i = 0, $j$2$i = 0, $l$0 = 0, $l$0$i = 0, $l$1$i = 0, $l$1113 = 0, $l$2 = 0, $l10n$0 = 0, $l10n$0$lcssa = 0, $l10n$0$phi = 0;
 var $l10n$1 = 0, $l10n$2 = 0, $l10n$3 = 0, $mb = 0, $notlhs$i = 0, $notrhs$i = 0, $or$cond = 0, $or$cond$i = 0, $or$cond15 = 0, $or$cond17 = 0, $or$cond20 = 0, $or$cond240 = 0, $or$cond29$i = 0, $or$cond3$not$i = 0, $or$cond6$i = 0, $p$0 = 0, $p$1 = 0, $p$2 = 0, $p$2$ = 0, $p$3 = 0;
 var $p$4198 = 0, $p$5 = 0, $pl$0 = 0, $pl$0$i = 0, $pl$1 = 0, $pl$1$i = 0, $pl$2 = 0, $prefix$0 = 0, $prefix$0$$i = 0, $prefix$0$i = 0, $prefix$1 = 0, $prefix$2 = 0, $r$0$a$8$i = 0, $re$169$i = 0, $round$068$i = 0.0, $round6$1$i = 0.0, $s$0$i = 0, $s$1$i = 0, $s$1$i$lcssa = 0, $s1$0$i = 0;
 var $s7$079$i = 0, $s7$1$i = 0, $s8$0$lcssa$i = 0, $s8$070$i = 0, $s9$0$i = 0, $s9$183$i = 0, $s9$2$i = 0, $small$0$i = 0.0, $small$1$i = 0.0, $st$0 = 0, $st$0$lcssa322 = 0, $storemerge = 0, $storemerge13 = 0, $storemerge8108 = 0, $storemerge860 = 0, $sum = 0, $t$0 = 0, $t$1 = 0, $w$$i = 0, $w$0 = 0;
 var $w$1 = 0, $w$2 = 0, $w$30$i = 0, $wc = 0, $ws$0115 = 0, $ws$1126 = 0, $z$0$i = 0, $z$0$lcssa = 0, $z$0102 = 0, $z$1 = 0, $z$1$lcssa$i = 0, $z$1146$i = 0, $z$2 = 0, $z$2$i = 0, $z$2$i$lcssa = 0, $z$3$lcssa$i = 0, $z$3133$i = 0, $z$4$i = 0, $z$6$$i = 0, $z$6$i = 0;
 var $z$6$i$lcssa = 0, $z$6$ph$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 624|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $big$i = sp + 24|0;
 $e2$i = sp + 16|0;
 $buf$i = sp + 588|0;
 $ebuf0$i = sp + 576|0;
 $arg = sp;
 $buf = sp + 536|0;
 $wc = sp + 8|0;
 $mb = sp + 528|0;
 $0 = ($f|0)!=(0|0);
 $1 = ((($buf)) + 40|0);
 $2 = $1;
 $3 = ((($buf)) + 39|0);
 $4 = ((($wc)) + 4|0);
 $5 = ((($ebuf0$i)) + 12|0);
 $6 = ((($ebuf0$i)) + 11|0);
 $7 = $buf$i;
 $8 = $5;
 $9 = (($8) - ($7))|0;
 $10 = (-2 - ($7))|0;
 $11 = (($8) + 2)|0;
 $12 = ((($big$i)) + 288|0);
 $13 = ((($buf$i)) + 9|0);
 $14 = $13;
 $15 = ((($buf$i)) + 8|0);
 $cnt$0 = 0;$fmt41 = $fmt;$l$0 = 0;$l10n$0 = 0;
 L1: while(1) {
  $16 = ($cnt$0|0)>(-1);
  do {
   if ($16) {
    $17 = (2147483647 - ($cnt$0))|0;
    $18 = ($l$0|0)>($17|0);
    if ($18) {
     $19 = (___errno_location()|0);
     HEAP32[$19>>2] = 75;
     $cnt$1 = -1;
     break;
    } else {
     $20 = (($l$0) + ($cnt$0))|0;
     $cnt$1 = $20;
     break;
    }
   } else {
    $cnt$1 = $cnt$0;
   }
  } while(0);
  $21 = HEAP8[$fmt41>>0]|0;
  $22 = ($21<<24>>24)==(0);
  if ($22) {
   $cnt$1$lcssa = $cnt$1;$l10n$0$lcssa = $l10n$0;
   label = 245;
   break;
  } else {
   $23 = $21;$fmt40 = $fmt41;
  }
  L9: while(1) {
   switch ($23<<24>>24) {
   case 37:  {
    $fmt39101 = $fmt40;$z$0102 = $fmt40;
    label = 9;
    break L9;
    break;
   }
   case 0:  {
    $fmt39$lcssa = $fmt40;$z$0$lcssa = $fmt40;
    break L9;
    break;
   }
   default: {
   }
   }
   $24 = ((($fmt40)) + 1|0);
   $$pre = HEAP8[$24>>0]|0;
   $23 = $$pre;$fmt40 = $24;
  }
  L12: do {
   if ((label|0) == 9) {
    while(1) {
     label = 0;
     $25 = ((($fmt39101)) + 1|0);
     $26 = HEAP8[$25>>0]|0;
     $27 = ($26<<24>>24)==(37);
     if (!($27)) {
      $fmt39$lcssa = $fmt39101;$z$0$lcssa = $z$0102;
      break L12;
     }
     $28 = ((($z$0102)) + 1|0);
     $29 = ((($fmt39101)) + 2|0);
     $30 = HEAP8[$29>>0]|0;
     $31 = ($30<<24>>24)==(37);
     if ($31) {
      $fmt39101 = $29;$z$0102 = $28;
      label = 9;
     } else {
      $fmt39$lcssa = $29;$z$0$lcssa = $28;
      break;
     }
    }
   }
  } while(0);
  $32 = $z$0$lcssa;
  $33 = $fmt41;
  $34 = (($32) - ($33))|0;
  if ($0) {
   $35 = HEAP32[$f>>2]|0;
   $36 = $35 & 32;
   $37 = ($36|0)==(0);
   if ($37) {
    (___fwritex($fmt41,$34,$f)|0);
   }
  }
  $38 = ($z$0$lcssa|0)==($fmt41|0);
  if (!($38)) {
   $l10n$0$phi = $l10n$0;$cnt$0 = $cnt$1;$fmt41 = $fmt39$lcssa;$l$0 = $34;$l10n$0 = $l10n$0$phi;
   continue;
  }
  $39 = ((($fmt39$lcssa)) + 1|0);
  $40 = HEAP8[$39>>0]|0;
  $41 = $40 << 24 >> 24;
  $isdigittmp = (($41) + -48)|0;
  $isdigit = ($isdigittmp>>>0)<(10);
  if ($isdigit) {
   $42 = ((($fmt39$lcssa)) + 2|0);
   $43 = HEAP8[$42>>0]|0;
   $44 = ($43<<24>>24)==(36);
   $45 = ((($fmt39$lcssa)) + 3|0);
   $$51 = $44 ? $45 : $39;
   $$l10n$0 = $44 ? 1 : $l10n$0;
   $isdigittmp$ = $44 ? $isdigittmp : -1;
   $$pre193 = HEAP8[$$51>>0]|0;
   $47 = $$pre193;$argpos$0 = $isdigittmp$;$l10n$1 = $$l10n$0;$storemerge = $$51;
  } else {
   $47 = $40;$argpos$0 = -1;$l10n$1 = $l10n$0;$storemerge = $39;
  }
  $46 = $47 << 24 >> 24;
  $48 = $46 & -32;
  $49 = ($48|0)==(32);
  L25: do {
   if ($49) {
    $51 = $46;$56 = $47;$fl$0109 = 0;$storemerge8108 = $storemerge;
    while(1) {
     $50 = (($51) + -32)|0;
     $52 = 1 << $50;
     $53 = $52 & 75913;
     $54 = ($53|0)==(0);
     if ($54) {
      $65 = $56;$fl$062 = $fl$0109;$storemerge860 = $storemerge8108;
      break L25;
     }
     $55 = $56 << 24 >> 24;
     $57 = (($55) + -32)|0;
     $58 = 1 << $57;
     $59 = $58 | $fl$0109;
     $60 = ((($storemerge8108)) + 1|0);
     $61 = HEAP8[$60>>0]|0;
     $62 = $61 << 24 >> 24;
     $63 = $62 & -32;
     $64 = ($63|0)==(32);
     if ($64) {
      $51 = $62;$56 = $61;$fl$0109 = $59;$storemerge8108 = $60;
     } else {
      $65 = $61;$fl$062 = $59;$storemerge860 = $60;
      break;
     }
    }
   } else {
    $65 = $47;$fl$062 = 0;$storemerge860 = $storemerge;
   }
  } while(0);
  $66 = ($65<<24>>24)==(42);
  do {
   if ($66) {
    $67 = ((($storemerge860)) + 1|0);
    $68 = HEAP8[$67>>0]|0;
    $69 = $68 << 24 >> 24;
    $isdigittmp11 = (($69) + -48)|0;
    $isdigit12 = ($isdigittmp11>>>0)<(10);
    if ($isdigit12) {
     $70 = ((($storemerge860)) + 2|0);
     $71 = HEAP8[$70>>0]|0;
     $72 = ($71<<24>>24)==(36);
     if ($72) {
      $73 = (($nl_type) + ($isdigittmp11<<2)|0);
      HEAP32[$73>>2] = 10;
      $74 = HEAP8[$67>>0]|0;
      $75 = $74 << 24 >> 24;
      $76 = (($75) + -48)|0;
      $77 = (($nl_arg) + ($76<<3)|0);
      $78 = $77;
      $79 = $78;
      $80 = HEAP32[$79>>2]|0;
      $81 = (($78) + 4)|0;
      $82 = $81;
      $83 = HEAP32[$82>>2]|0;
      $84 = ((($storemerge860)) + 3|0);
      $l10n$2 = 1;$storemerge13 = $84;$w$0 = $80;
     } else {
      label = 24;
     }
    } else {
     label = 24;
    }
    if ((label|0) == 24) {
     label = 0;
     $85 = ($l10n$1|0)==(0);
     if (!($85)) {
      $$0 = -1;
      break L1;
     }
     if (!($0)) {
      $fl$1 = $fl$062;$fmt42 = $67;$l10n$3 = 0;$w$1 = 0;
      break;
     }
     $arglist_current = HEAP32[$ap>>2]|0;
     $86 = $arglist_current;
     $87 = ((0) + 4|0);
     $expanded4 = $87;
     $expanded = (($expanded4) - 1)|0;
     $88 = (($86) + ($expanded))|0;
     $89 = ((0) + 4|0);
     $expanded8 = $89;
     $expanded7 = (($expanded8) - 1)|0;
     $expanded6 = $expanded7 ^ -1;
     $90 = $88 & $expanded6;
     $91 = $90;
     $92 = HEAP32[$91>>2]|0;
     $arglist_next = ((($91)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next;
     $l10n$2 = 0;$storemerge13 = $67;$w$0 = $92;
    }
    $93 = ($w$0|0)<(0);
    if ($93) {
     $94 = $fl$062 | 8192;
     $95 = (0 - ($w$0))|0;
     $fl$1 = $94;$fmt42 = $storemerge13;$l10n$3 = $l10n$2;$w$1 = $95;
    } else {
     $fl$1 = $fl$062;$fmt42 = $storemerge13;$l10n$3 = $l10n$2;$w$1 = $w$0;
    }
   } else {
    $96 = $65 << 24 >> 24;
    $isdigittmp1$i = (($96) + -48)|0;
    $isdigit2$i = ($isdigittmp1$i>>>0)<(10);
    if ($isdigit2$i) {
     $100 = $storemerge860;$i$03$i = 0;$isdigittmp4$i = $isdigittmp1$i;
     while(1) {
      $97 = ($i$03$i*10)|0;
      $98 = (($97) + ($isdigittmp4$i))|0;
      $99 = ((($100)) + 1|0);
      $101 = HEAP8[$99>>0]|0;
      $102 = $101 << 24 >> 24;
      $isdigittmp$i = (($102) + -48)|0;
      $isdigit$i = ($isdigittmp$i>>>0)<(10);
      if ($isdigit$i) {
       $100 = $99;$i$03$i = $98;$isdigittmp4$i = $isdigittmp$i;
      } else {
       $$lcssa = $98;$$lcssa318 = $99;
       break;
      }
     }
     $103 = ($$lcssa|0)<(0);
     if ($103) {
      $$0 = -1;
      break L1;
     } else {
      $fl$1 = $fl$062;$fmt42 = $$lcssa318;$l10n$3 = $l10n$1;$w$1 = $$lcssa;
     }
    } else {
     $fl$1 = $fl$062;$fmt42 = $storemerge860;$l10n$3 = $l10n$1;$w$1 = 0;
    }
   }
  } while(0);
  $104 = HEAP8[$fmt42>>0]|0;
  $105 = ($104<<24>>24)==(46);
  L46: do {
   if ($105) {
    $106 = ((($fmt42)) + 1|0);
    $107 = HEAP8[$106>>0]|0;
    $108 = ($107<<24>>24)==(42);
    if (!($108)) {
     $135 = $107 << 24 >> 24;
     $isdigittmp1$i22 = (($135) + -48)|0;
     $isdigit2$i23 = ($isdigittmp1$i22>>>0)<(10);
     if ($isdigit2$i23) {
      $139 = $106;$i$03$i25 = 0;$isdigittmp4$i24 = $isdigittmp1$i22;
     } else {
      $fmt45 = $106;$p$0 = 0;
      break;
     }
     while(1) {
      $136 = ($i$03$i25*10)|0;
      $137 = (($136) + ($isdigittmp4$i24))|0;
      $138 = ((($139)) + 1|0);
      $140 = HEAP8[$138>>0]|0;
      $141 = $140 << 24 >> 24;
      $isdigittmp$i26 = (($141) + -48)|0;
      $isdigit$i27 = ($isdigittmp$i26>>>0)<(10);
      if ($isdigit$i27) {
       $139 = $138;$i$03$i25 = $137;$isdigittmp4$i24 = $isdigittmp$i26;
      } else {
       $fmt45 = $138;$p$0 = $137;
       break L46;
      }
     }
    }
    $109 = ((($fmt42)) + 2|0);
    $110 = HEAP8[$109>>0]|0;
    $111 = $110 << 24 >> 24;
    $isdigittmp9 = (($111) + -48)|0;
    $isdigit10 = ($isdigittmp9>>>0)<(10);
    if ($isdigit10) {
     $112 = ((($fmt42)) + 3|0);
     $113 = HEAP8[$112>>0]|0;
     $114 = ($113<<24>>24)==(36);
     if ($114) {
      $115 = (($nl_type) + ($isdigittmp9<<2)|0);
      HEAP32[$115>>2] = 10;
      $116 = HEAP8[$109>>0]|0;
      $117 = $116 << 24 >> 24;
      $118 = (($117) + -48)|0;
      $119 = (($nl_arg) + ($118<<3)|0);
      $120 = $119;
      $121 = $120;
      $122 = HEAP32[$121>>2]|0;
      $123 = (($120) + 4)|0;
      $124 = $123;
      $125 = HEAP32[$124>>2]|0;
      $126 = ((($fmt42)) + 4|0);
      $fmt45 = $126;$p$0 = $122;
      break;
     }
    }
    $127 = ($l10n$3|0)==(0);
    if (!($127)) {
     $$0 = -1;
     break L1;
    }
    if ($0) {
     $arglist_current2 = HEAP32[$ap>>2]|0;
     $128 = $arglist_current2;
     $129 = ((0) + 4|0);
     $expanded11 = $129;
     $expanded10 = (($expanded11) - 1)|0;
     $130 = (($128) + ($expanded10))|0;
     $131 = ((0) + 4|0);
     $expanded15 = $131;
     $expanded14 = (($expanded15) - 1)|0;
     $expanded13 = $expanded14 ^ -1;
     $132 = $130 & $expanded13;
     $133 = $132;
     $134 = HEAP32[$133>>2]|0;
     $arglist_next3 = ((($133)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next3;
     $fmt45 = $109;$p$0 = $134;
    } else {
     $fmt45 = $109;$p$0 = 0;
    }
   } else {
    $fmt45 = $fmt42;$p$0 = -1;
   }
  } while(0);
  $fmt44 = $fmt45;$st$0 = 0;
  while(1) {
   $142 = HEAP8[$fmt44>>0]|0;
   $143 = $142 << 24 >> 24;
   $144 = (($143) + -65)|0;
   $145 = ($144>>>0)>(57);
   if ($145) {
    $$0 = -1;
    break L1;
   }
   $146 = ((($fmt44)) + 1|0);
   $147 = ((66967 + (($st$0*58)|0)|0) + ($144)|0);
   $148 = HEAP8[$147>>0]|0;
   $149 = $148&255;
   $150 = (($149) + -1)|0;
   $151 = ($150>>>0)<(8);
   if ($151) {
    $fmt44 = $146;$st$0 = $149;
   } else {
    $$lcssa323 = $146;$$lcssa324 = $148;$$lcssa325 = $149;$fmt44$lcssa321 = $fmt44;$st$0$lcssa322 = $st$0;
    break;
   }
  }
  $152 = ($$lcssa324<<24>>24)==(0);
  if ($152) {
   $$0 = -1;
   break;
  }
  $153 = ($$lcssa324<<24>>24)==(19);
  $154 = ($argpos$0|0)>(-1);
  do {
   if ($153) {
    if ($154) {
     $$0 = -1;
     break L1;
    } else {
     label = 52;
    }
   } else {
    if ($154) {
     $155 = (($nl_type) + ($argpos$0<<2)|0);
     HEAP32[$155>>2] = $$lcssa325;
     $156 = (($nl_arg) + ($argpos$0<<3)|0);
     $157 = $156;
     $158 = $157;
     $159 = HEAP32[$158>>2]|0;
     $160 = (($157) + 4)|0;
     $161 = $160;
     $162 = HEAP32[$161>>2]|0;
     $163 = $arg;
     $164 = $163;
     HEAP32[$164>>2] = $159;
     $165 = (($163) + 4)|0;
     $166 = $165;
     HEAP32[$166>>2] = $162;
     label = 52;
     break;
    }
    if (!($0)) {
     $$0 = 0;
     break L1;
    }
    _pop_arg($arg,$$lcssa325,$ap);
   }
  } while(0);
  if ((label|0) == 52) {
   label = 0;
   if (!($0)) {
    $cnt$0 = $cnt$1;$fmt41 = $$lcssa323;$l$0 = $34;$l10n$0 = $l10n$3;
    continue;
   }
  }
  $167 = HEAP8[$fmt44$lcssa321>>0]|0;
  $168 = $167 << 24 >> 24;
  $169 = ($st$0$lcssa322|0)!=(0);
  $170 = $168 & 15;
  $171 = ($170|0)==(3);
  $or$cond15 = $169 & $171;
  $172 = $168 & -33;
  $t$0 = $or$cond15 ? $172 : $168;
  $173 = $fl$1 & 8192;
  $174 = ($173|0)==(0);
  $175 = $fl$1 & -65537;
  $fl$1$ = $174 ? $fl$1 : $175;
  L75: do {
   switch ($t$0|0) {
   case 110:  {
    switch ($st$0$lcssa322|0) {
    case 0:  {
     $182 = HEAP32[$arg>>2]|0;
     HEAP32[$182>>2] = $cnt$1;
     $cnt$0 = $cnt$1;$fmt41 = $$lcssa323;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 1:  {
     $183 = HEAP32[$arg>>2]|0;
     HEAP32[$183>>2] = $cnt$1;
     $cnt$0 = $cnt$1;$fmt41 = $$lcssa323;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 2:  {
     $184 = ($cnt$1|0)<(0);
     $185 = $184 << 31 >> 31;
     $186 = HEAP32[$arg>>2]|0;
     $187 = $186;
     $188 = $187;
     HEAP32[$188>>2] = $cnt$1;
     $189 = (($187) + 4)|0;
     $190 = $189;
     HEAP32[$190>>2] = $185;
     $cnt$0 = $cnt$1;$fmt41 = $$lcssa323;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 3:  {
     $191 = $cnt$1&65535;
     $192 = HEAP32[$arg>>2]|0;
     HEAP16[$192>>1] = $191;
     $cnt$0 = $cnt$1;$fmt41 = $$lcssa323;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 4:  {
     $193 = $cnt$1&255;
     $194 = HEAP32[$arg>>2]|0;
     HEAP8[$194>>0] = $193;
     $cnt$0 = $cnt$1;$fmt41 = $$lcssa323;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 6:  {
     $195 = HEAP32[$arg>>2]|0;
     HEAP32[$195>>2] = $cnt$1;
     $cnt$0 = $cnt$1;$fmt41 = $$lcssa323;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 7:  {
     $196 = ($cnt$1|0)<(0);
     $197 = $196 << 31 >> 31;
     $198 = HEAP32[$arg>>2]|0;
     $199 = $198;
     $200 = $199;
     HEAP32[$200>>2] = $cnt$1;
     $201 = (($199) + 4)|0;
     $202 = $201;
     HEAP32[$202>>2] = $197;
     $cnt$0 = $cnt$1;$fmt41 = $$lcssa323;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    default: {
     $cnt$0 = $cnt$1;$fmt41 = $$lcssa323;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
    }
    }
    break;
   }
   case 112:  {
    $203 = ($p$0>>>0)>(8);
    $204 = $203 ? $p$0 : 8;
    $205 = $fl$1$ | 8;
    $fl$3 = $205;$p$1 = $204;$t$1 = 120;
    label = 64;
    break;
   }
   case 88: case 120:  {
    $fl$3 = $fl$1$;$p$1 = $p$0;$t$1 = $t$0;
    label = 64;
    break;
   }
   case 111:  {
    $243 = $arg;
    $244 = $243;
    $245 = HEAP32[$244>>2]|0;
    $246 = (($243) + 4)|0;
    $247 = $246;
    $248 = HEAP32[$247>>2]|0;
    $249 = ($245|0)==(0);
    $250 = ($248|0)==(0);
    $251 = $249 & $250;
    if ($251) {
     $$0$lcssa$i = $1;
    } else {
     $$03$i33 = $1;$253 = $245;$257 = $248;
     while(1) {
      $252 = $253 & 7;
      $254 = $252 | 48;
      $255 = $254&255;
      $256 = ((($$03$i33)) + -1|0);
      HEAP8[$256>>0] = $255;
      $258 = (_bitshift64Lshr(($253|0),($257|0),3)|0);
      $259 = tempRet0;
      $260 = ($258|0)==(0);
      $261 = ($259|0)==(0);
      $262 = $260 & $261;
      if ($262) {
       $$0$lcssa$i = $256;
       break;
      } else {
       $$03$i33 = $256;$253 = $258;$257 = $259;
      }
     }
    }
    $263 = $fl$1$ & 8;
    $264 = ($263|0)==(0);
    if ($264) {
     $a$0 = $$0$lcssa$i;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = 0;$prefix$1 = 67447;
     label = 77;
    } else {
     $265 = $$0$lcssa$i;
     $266 = (($2) - ($265))|0;
     $267 = (($266) + 1)|0;
     $268 = ($p$0|0)<($267|0);
     $$p$0 = $268 ? $267 : $p$0;
     $a$0 = $$0$lcssa$i;$fl$4 = $fl$1$;$p$2 = $$p$0;$pl$1 = 0;$prefix$1 = 67447;
     label = 77;
    }
    break;
   }
   case 105: case 100:  {
    $269 = $arg;
    $270 = $269;
    $271 = HEAP32[$270>>2]|0;
    $272 = (($269) + 4)|0;
    $273 = $272;
    $274 = HEAP32[$273>>2]|0;
    $275 = ($274|0)<(0);
    if ($275) {
     $276 = (_i64Subtract(0,0,($271|0),($274|0))|0);
     $277 = tempRet0;
     $278 = $arg;
     $279 = $278;
     HEAP32[$279>>2] = $276;
     $280 = (($278) + 4)|0;
     $281 = $280;
     HEAP32[$281>>2] = $277;
     $286 = $276;$287 = $277;$pl$0 = 1;$prefix$0 = 67447;
     label = 76;
     break L75;
    }
    $282 = $fl$1$ & 2048;
    $283 = ($282|0)==(0);
    if ($283) {
     $284 = $fl$1$ & 1;
     $285 = ($284|0)==(0);
     $$ = $285 ? 67447 : (67449);
     $286 = $271;$287 = $274;$pl$0 = $284;$prefix$0 = $$;
     label = 76;
    } else {
     $286 = $271;$287 = $274;$pl$0 = 1;$prefix$0 = (67448);
     label = 76;
    }
    break;
   }
   case 117:  {
    $176 = $arg;
    $177 = $176;
    $178 = HEAP32[$177>>2]|0;
    $179 = (($176) + 4)|0;
    $180 = $179;
    $181 = HEAP32[$180>>2]|0;
    $286 = $178;$287 = $181;$pl$0 = 0;$prefix$0 = 67447;
    label = 76;
    break;
   }
   case 99:  {
    $307 = $arg;
    $308 = $307;
    $309 = HEAP32[$308>>2]|0;
    $310 = (($307) + 4)|0;
    $311 = $310;
    $312 = HEAP32[$311>>2]|0;
    $313 = $309&255;
    HEAP8[$3>>0] = $313;
    $a$2 = $3;$fl$6 = $175;$p$5 = 1;$pl$2 = 0;$prefix$2 = 67447;$z$2 = $1;
    break;
   }
   case 109:  {
    $314 = (___errno_location()|0);
    $315 = HEAP32[$314>>2]|0;
    $316 = (_strerror($315)|0);
    $a$1 = $316;
    label = 82;
    break;
   }
   case 115:  {
    $317 = HEAP32[$arg>>2]|0;
    $318 = ($317|0)!=(0|0);
    $319 = $318 ? $317 : 67457;
    $a$1 = $319;
    label = 82;
    break;
   }
   case 67:  {
    $326 = $arg;
    $327 = $326;
    $328 = HEAP32[$327>>2]|0;
    $329 = (($326) + 4)|0;
    $330 = $329;
    $331 = HEAP32[$330>>2]|0;
    HEAP32[$wc>>2] = $328;
    HEAP32[$4>>2] = 0;
    HEAP32[$arg>>2] = $wc;
    $p$4198 = -1;
    label = 86;
    break;
   }
   case 83:  {
    $332 = ($p$0|0)==(0);
    if ($332) {
     _pad($f,32,$w$1,0,$fl$1$);
     $i$0$lcssa200 = 0;
     label = 98;
    } else {
     $p$4198 = $p$0;
     label = 86;
    }
    break;
   }
   case 65: case 71: case 70: case 69: case 97: case 103: case 102: case 101:  {
    $359 = +HEAPF64[$arg>>3];
    HEAP32[$e2$i>>2] = 0;
    HEAPF64[tempDoublePtr>>3] = $359;$360 = HEAP32[tempDoublePtr>>2]|0;
    $361 = HEAP32[tempDoublePtr+4>>2]|0;
    $362 = ($361|0)<(0);
    if ($362) {
     $363 = -$359;
     $$07$i = $363;$pl$0$i = 1;$prefix$0$i = 67464;
    } else {
     $364 = $fl$1$ & 2048;
     $365 = ($364|0)==(0);
     if ($365) {
      $366 = $fl$1$ & 1;
      $367 = ($366|0)==(0);
      $$$i = $367 ? (67465) : (67470);
      $$07$i = $359;$pl$0$i = $366;$prefix$0$i = $$$i;
     } else {
      $$07$i = $359;$pl$0$i = 1;$prefix$0$i = (67467);
     }
    }
    HEAPF64[tempDoublePtr>>3] = $$07$i;$368 = HEAP32[tempDoublePtr>>2]|0;
    $369 = HEAP32[tempDoublePtr+4>>2]|0;
    $370 = $369 & 2146435072;
    $371 = ($370>>>0)<(2146435072);
    $372 = (0)<(0);
    $373 = ($370|0)==(2146435072);
    $374 = $373 & $372;
    $375 = $371 | $374;
    do {
     if ($375) {
      $391 = (+_frexpl($$07$i,$e2$i));
      $392 = $391 * 2.0;
      $393 = $392 != 0.0;
      if ($393) {
       $394 = HEAP32[$e2$i>>2]|0;
       $395 = (($394) + -1)|0;
       HEAP32[$e2$i>>2] = $395;
      }
      $396 = $t$0 | 32;
      $397 = ($396|0)==(97);
      if ($397) {
       $398 = $t$0 & 32;
       $399 = ($398|0)==(0);
       $400 = ((($prefix$0$i)) + 9|0);
       $prefix$0$$i = $399 ? $prefix$0$i : $400;
       $401 = $pl$0$i | 2;
       $402 = ($p$0>>>0)>(11);
       $403 = (12 - ($p$0))|0;
       $404 = ($403|0)==(0);
       $405 = $402 | $404;
       do {
        if ($405) {
         $$1$i = $392;
        } else {
         $re$169$i = $403;$round$068$i = 8.0;
         while(1) {
          $406 = (($re$169$i) + -1)|0;
          $407 = $round$068$i * 16.0;
          $408 = ($406|0)==(0);
          if ($408) {
           $$lcssa342 = $407;
           break;
          } else {
           $re$169$i = $406;$round$068$i = $407;
          }
         }
         $409 = HEAP8[$prefix$0$$i>>0]|0;
         $410 = ($409<<24>>24)==(45);
         if ($410) {
          $411 = -$392;
          $412 = $411 - $$lcssa342;
          $413 = $$lcssa342 + $412;
          $414 = -$413;
          $$1$i = $414;
          break;
         } else {
          $415 = $392 + $$lcssa342;
          $416 = $415 - $$lcssa342;
          $$1$i = $416;
          break;
         }
        }
       } while(0);
       $417 = HEAP32[$e2$i>>2]|0;
       $418 = ($417|0)<(0);
       $419 = (0 - ($417))|0;
       $420 = $418 ? $419 : $417;
       $421 = ($420|0)<(0);
       $422 = $421 << 31 >> 31;
       $423 = (_fmt_u($420,$422,$5)|0);
       $424 = ($423|0)==($5|0);
       if ($424) {
        HEAP8[$6>>0] = 48;
        $estr$0$i = $6;
       } else {
        $estr$0$i = $423;
       }
       $425 = $417 >> 31;
       $426 = $425 & 2;
       $427 = (($426) + 43)|0;
       $428 = $427&255;
       $429 = ((($estr$0$i)) + -1|0);
       HEAP8[$429>>0] = $428;
       $430 = (($t$0) + 15)|0;
       $431 = $430&255;
       $432 = ((($estr$0$i)) + -2|0);
       HEAP8[$432>>0] = $431;
       $notrhs$i = ($p$0|0)<(1);
       $433 = $fl$1$ & 8;
       $434 = ($433|0)==(0);
       $$2$i = $$1$i;$s$0$i = $buf$i;
       while(1) {
        $435 = (~~(($$2$i)));
        $436 = (67431 + ($435)|0);
        $437 = HEAP8[$436>>0]|0;
        $438 = $437&255;
        $439 = $438 | $398;
        $440 = $439&255;
        $441 = ((($s$0$i)) + 1|0);
        HEAP8[$s$0$i>>0] = $440;
        $442 = (+($435|0));
        $443 = $$2$i - $442;
        $444 = $443 * 16.0;
        $445 = $441;
        $446 = (($445) - ($7))|0;
        $447 = ($446|0)==(1);
        do {
         if ($447) {
          $notlhs$i = $444 == 0.0;
          $or$cond3$not$i = $notrhs$i & $notlhs$i;
          $or$cond$i = $434 & $or$cond3$not$i;
          if ($or$cond$i) {
           $s$1$i = $441;
           break;
          }
          $448 = ((($s$0$i)) + 2|0);
          HEAP8[$441>>0] = 46;
          $s$1$i = $448;
         } else {
          $s$1$i = $441;
         }
        } while(0);
        $449 = $444 != 0.0;
        if ($449) {
         $$2$i = $444;$s$0$i = $s$1$i;
        } else {
         $s$1$i$lcssa = $s$1$i;
         break;
        }
       }
       $450 = ($p$0|0)!=(0);
       $$pre182$i = $s$1$i$lcssa;
       $451 = (($10) + ($$pre182$i))|0;
       $452 = ($451|0)<($p$0|0);
       $or$cond240 = $450 & $452;
       $453 = $432;
       $454 = (($11) + ($p$0))|0;
       $455 = (($454) - ($453))|0;
       $456 = $432;
       $457 = (($9) - ($456))|0;
       $458 = (($457) + ($$pre182$i))|0;
       $l$0$i = $or$cond240 ? $455 : $458;
       $459 = (($l$0$i) + ($401))|0;
       _pad($f,32,$w$1,$459,$fl$1$);
       $460 = HEAP32[$f>>2]|0;
       $461 = $460 & 32;
       $462 = ($461|0)==(0);
       if ($462) {
        (___fwritex($prefix$0$$i,$401,$f)|0);
       }
       $463 = $fl$1$ ^ 65536;
       _pad($f,48,$w$1,$459,$463);
       $464 = (($$pre182$i) - ($7))|0;
       $465 = HEAP32[$f>>2]|0;
       $466 = $465 & 32;
       $467 = ($466|0)==(0);
       if ($467) {
        (___fwritex($buf$i,$464,$f)|0);
       }
       $468 = $432;
       $469 = (($8) - ($468))|0;
       $sum = (($464) + ($469))|0;
       $470 = (($l$0$i) - ($sum))|0;
       _pad($f,48,$470,0,0);
       $471 = HEAP32[$f>>2]|0;
       $472 = $471 & 32;
       $473 = ($472|0)==(0);
       if ($473) {
        (___fwritex($432,$469,$f)|0);
       }
       $474 = $fl$1$ ^ 8192;
       _pad($f,32,$w$1,$459,$474);
       $475 = ($459|0)<($w$1|0);
       $w$$i = $475 ? $w$1 : $459;
       $$0$i = $w$$i;
       break;
      }
      $476 = ($p$0|0)<(0);
      $$p$i = $476 ? 6 : $p$0;
      if ($393) {
       $477 = $392 * 268435456.0;
       $478 = HEAP32[$e2$i>>2]|0;
       $479 = (($478) + -28)|0;
       HEAP32[$e2$i>>2] = $479;
       $$3$i = $477;$480 = $479;
      } else {
       $$pre179$i = HEAP32[$e2$i>>2]|0;
       $$3$i = $392;$480 = $$pre179$i;
      }
      $481 = ($480|0)<(0);
      $$31$i = $481 ? $big$i : $12;
      $482 = $$31$i;
      $$4$i = $$3$i;$z$0$i = $$31$i;
      while(1) {
       $483 = (~~(($$4$i))>>>0);
       HEAP32[$z$0$i>>2] = $483;
       $484 = ((($z$0$i)) + 4|0);
       $485 = (+($483>>>0));
       $486 = $$4$i - $485;
       $487 = $486 * 1.0E+9;
       $488 = $487 != 0.0;
       if ($488) {
        $$4$i = $487;$z$0$i = $484;
       } else {
        $$lcssa326 = $484;
        break;
       }
      }
      $$pr$i = HEAP32[$e2$i>>2]|0;
      $489 = ($$pr$i|0)>(0);
      if ($489) {
       $490 = $$pr$i;$a$1147$i = $$31$i;$z$1146$i = $$lcssa326;
       while(1) {
        $491 = ($490|0)>(29);
        $492 = $491 ? 29 : $490;
        $d$0139$i = ((($z$1146$i)) + -4|0);
        $493 = ($d$0139$i>>>0)<($a$1147$i>>>0);
        do {
         if ($493) {
          $a$2$ph$i = $a$1147$i;
         } else {
          $carry$0140$i = 0;$d$0141$i = $d$0139$i;
          while(1) {
           $494 = HEAP32[$d$0141$i>>2]|0;
           $495 = (_bitshift64Shl(($494|0),0,($492|0))|0);
           $496 = tempRet0;
           $497 = (_i64Add(($495|0),($496|0),($carry$0140$i|0),0)|0);
           $498 = tempRet0;
           $499 = (___uremdi3(($497|0),($498|0),1000000000,0)|0);
           $500 = tempRet0;
           HEAP32[$d$0141$i>>2] = $499;
           $501 = (___udivdi3(($497|0),($498|0),1000000000,0)|0);
           $502 = tempRet0;
           $d$0$i = ((($d$0141$i)) + -4|0);
           $503 = ($d$0$i>>>0)<($a$1147$i>>>0);
           if ($503) {
            $$lcssa327 = $501;
            break;
           } else {
            $carry$0140$i = $501;$d$0141$i = $d$0$i;
           }
          }
          $504 = ($$lcssa327|0)==(0);
          if ($504) {
           $a$2$ph$i = $a$1147$i;
           break;
          }
          $505 = ((($a$1147$i)) + -4|0);
          HEAP32[$505>>2] = $$lcssa327;
          $a$2$ph$i = $505;
         }
        } while(0);
        $z$2$i = $z$1146$i;
        while(1) {
         $506 = ($z$2$i>>>0)>($a$2$ph$i>>>0);
         if (!($506)) {
          $z$2$i$lcssa = $z$2$i;
          break;
         }
         $507 = ((($z$2$i)) + -4|0);
         $508 = HEAP32[$507>>2]|0;
         $509 = ($508|0)==(0);
         if ($509) {
          $z$2$i = $507;
         } else {
          $z$2$i$lcssa = $z$2$i;
          break;
         }
        }
        $510 = HEAP32[$e2$i>>2]|0;
        $511 = (($510) - ($492))|0;
        HEAP32[$e2$i>>2] = $511;
        $512 = ($511|0)>(0);
        if ($512) {
         $490 = $511;$a$1147$i = $a$2$ph$i;$z$1146$i = $z$2$i$lcssa;
        } else {
         $$pr47$i = $511;$a$1$lcssa$i = $a$2$ph$i;$z$1$lcssa$i = $z$2$i$lcssa;
         break;
        }
       }
      } else {
       $$pr47$i = $$pr$i;$a$1$lcssa$i = $$31$i;$z$1$lcssa$i = $$lcssa326;
      }
      $513 = ($$pr47$i|0)<(0);
      if ($513) {
       $514 = (($$p$i) + 25)|0;
       $515 = (($514|0) / 9)&-1;
       $516 = (($515) + 1)|0;
       $517 = ($396|0)==(102);
       $519 = $$pr47$i;$a$3134$i = $a$1$lcssa$i;$z$3133$i = $z$1$lcssa$i;
       while(1) {
        $518 = (0 - ($519))|0;
        $520 = ($518|0)>(9);
        $521 = $520 ? 9 : $518;
        $522 = ($a$3134$i>>>0)<($z$3133$i>>>0);
        do {
         if ($522) {
          $526 = 1 << $521;
          $527 = (($526) + -1)|0;
          $528 = 1000000000 >>> $521;
          $carry3$0128$i = 0;$d$1127$i = $a$3134$i;
          while(1) {
           $529 = HEAP32[$d$1127$i>>2]|0;
           $530 = $529 & $527;
           $531 = $529 >>> $521;
           $532 = (($531) + ($carry3$0128$i))|0;
           HEAP32[$d$1127$i>>2] = $532;
           $533 = Math_imul($530, $528)|0;
           $534 = ((($d$1127$i)) + 4|0);
           $535 = ($534>>>0)<($z$3133$i>>>0);
           if ($535) {
            $carry3$0128$i = $533;$d$1127$i = $534;
           } else {
            $$lcssa329 = $533;
            break;
           }
          }
          $536 = HEAP32[$a$3134$i>>2]|0;
          $537 = ($536|0)==(0);
          $538 = ((($a$3134$i)) + 4|0);
          $$a$3$i = $537 ? $538 : $a$3134$i;
          $539 = ($$lcssa329|0)==(0);
          if ($539) {
           $$a$3186$i = $$a$3$i;$z$4$i = $z$3133$i;
           break;
          }
          $540 = ((($z$3133$i)) + 4|0);
          HEAP32[$z$3133$i>>2] = $$lcssa329;
          $$a$3186$i = $$a$3$i;$z$4$i = $540;
         } else {
          $523 = HEAP32[$a$3134$i>>2]|0;
          $524 = ($523|0)==(0);
          $525 = ((($a$3134$i)) + 4|0);
          $$a$3185$i = $524 ? $525 : $a$3134$i;
          $$a$3186$i = $$a$3185$i;$z$4$i = $z$3133$i;
         }
        } while(0);
        $541 = $517 ? $$31$i : $$a$3186$i;
        $542 = $z$4$i;
        $543 = $541;
        $544 = (($542) - ($543))|0;
        $545 = $544 >> 2;
        $546 = ($545|0)>($516|0);
        $547 = (($541) + ($516<<2)|0);
        $$z$4$i = $546 ? $547 : $z$4$i;
        $548 = HEAP32[$e2$i>>2]|0;
        $549 = (($548) + ($521))|0;
        HEAP32[$e2$i>>2] = $549;
        $550 = ($549|0)<(0);
        if ($550) {
         $519 = $549;$a$3134$i = $$a$3186$i;$z$3133$i = $$z$4$i;
        } else {
         $a$3$lcssa$i = $$a$3186$i;$z$3$lcssa$i = $$z$4$i;
         break;
        }
       }
      } else {
       $a$3$lcssa$i = $a$1$lcssa$i;$z$3$lcssa$i = $z$1$lcssa$i;
      }
      $551 = ($a$3$lcssa$i>>>0)<($z$3$lcssa$i>>>0);
      do {
       if ($551) {
        $552 = $a$3$lcssa$i;
        $553 = (($482) - ($552))|0;
        $554 = $553 >> 2;
        $555 = ($554*9)|0;
        $556 = HEAP32[$a$3$lcssa$i>>2]|0;
        $557 = ($556>>>0)<(10);
        if ($557) {
         $e$1$i = $555;
         break;
        } else {
         $e$0123$i = $555;$i$0122$i = 10;
        }
        while(1) {
         $558 = ($i$0122$i*10)|0;
         $559 = (($e$0123$i) + 1)|0;
         $560 = ($556>>>0)<($558>>>0);
         if ($560) {
          $e$1$i = $559;
          break;
         } else {
          $e$0123$i = $559;$i$0122$i = $558;
         }
        }
       } else {
        $e$1$i = 0;
       }
      } while(0);
      $561 = ($396|0)!=(102);
      $562 = $561 ? $e$1$i : 0;
      $563 = (($$p$i) - ($562))|0;
      $564 = ($396|0)==(103);
      $565 = ($$p$i|0)!=(0);
      $566 = $565 & $564;
      $$neg52$i = $566 << 31 >> 31;
      $567 = (($563) + ($$neg52$i))|0;
      $568 = $z$3$lcssa$i;
      $569 = (($568) - ($482))|0;
      $570 = $569 >> 2;
      $571 = ($570*9)|0;
      $572 = (($571) + -9)|0;
      $573 = ($567|0)<($572|0);
      if ($573) {
       $574 = (($567) + 9216)|0;
       $575 = (($574|0) / 9)&-1;
       $$sum$i = (($575) + -1023)|0;
       $576 = (($$31$i) + ($$sum$i<<2)|0);
       $577 = (($574|0) % 9)&-1;
       $j$0115$i = (($577) + 1)|0;
       $578 = ($j$0115$i|0)<(9);
       if ($578) {
        $i$1116$i = 10;$j$0117$i = $j$0115$i;
        while(1) {
         $579 = ($i$1116$i*10)|0;
         $j$0$i = (($j$0117$i) + 1)|0;
         $exitcond$i = ($j$0$i|0)==(9);
         if ($exitcond$i) {
          $i$1$lcssa$i = $579;
          break;
         } else {
          $i$1116$i = $579;$j$0117$i = $j$0$i;
         }
        }
       } else {
        $i$1$lcssa$i = 10;
       }
       $580 = HEAP32[$576>>2]|0;
       $581 = (($580>>>0) % ($i$1$lcssa$i>>>0))&-1;
       $582 = ($581|0)==(0);
       if ($582) {
        $$sum15$i = (($575) + -1022)|0;
        $583 = (($$31$i) + ($$sum15$i<<2)|0);
        $584 = ($583|0)==($z$3$lcssa$i|0);
        if ($584) {
         $a$7$i = $a$3$lcssa$i;$d$3$i = $576;$e$3$i = $e$1$i;
        } else {
         label = 163;
        }
       } else {
        label = 163;
       }
       do {
        if ((label|0) == 163) {
         label = 0;
         $585 = (($580>>>0) / ($i$1$lcssa$i>>>0))&-1;
         $586 = $585 & 1;
         $587 = ($586|0)==(0);
         $$20$i = $587 ? 9007199254740992.0 : 9007199254740994.0;
         $588 = (($i$1$lcssa$i|0) / 2)&-1;
         $589 = ($581>>>0)<($588>>>0);
         do {
          if ($589) {
           $small$0$i = 0.5;
          } else {
           $590 = ($581|0)==($588|0);
           if ($590) {
            $$sum16$i = (($575) + -1022)|0;
            $591 = (($$31$i) + ($$sum16$i<<2)|0);
            $592 = ($591|0)==($z$3$lcssa$i|0);
            if ($592) {
             $small$0$i = 1.0;
             break;
            }
           }
           $small$0$i = 1.5;
          }
         } while(0);
         $593 = ($pl$0$i|0)==(0);
         do {
          if ($593) {
           $round6$1$i = $$20$i;$small$1$i = $small$0$i;
          } else {
           $594 = HEAP8[$prefix$0$i>>0]|0;
           $595 = ($594<<24>>24)==(45);
           if (!($595)) {
            $round6$1$i = $$20$i;$small$1$i = $small$0$i;
            break;
           }
           $596 = -$$20$i;
           $597 = -$small$0$i;
           $round6$1$i = $596;$small$1$i = $597;
          }
         } while(0);
         $598 = (($580) - ($581))|0;
         HEAP32[$576>>2] = $598;
         $599 = $round6$1$i + $small$1$i;
         $600 = $599 != $round6$1$i;
         if (!($600)) {
          $a$7$i = $a$3$lcssa$i;$d$3$i = $576;$e$3$i = $e$1$i;
          break;
         }
         $601 = (($598) + ($i$1$lcssa$i))|0;
         HEAP32[$576>>2] = $601;
         $602 = ($601>>>0)>(999999999);
         if ($602) {
          $a$5109$i = $a$3$lcssa$i;$d$2108$i = $576;
          while(1) {
           $603 = ((($d$2108$i)) + -4|0);
           HEAP32[$d$2108$i>>2] = 0;
           $604 = ($603>>>0)<($a$5109$i>>>0);
           if ($604) {
            $605 = ((($a$5109$i)) + -4|0);
            HEAP32[$605>>2] = 0;
            $a$6$i = $605;
           } else {
            $a$6$i = $a$5109$i;
           }
           $606 = HEAP32[$603>>2]|0;
           $607 = (($606) + 1)|0;
           HEAP32[$603>>2] = $607;
           $608 = ($607>>>0)>(999999999);
           if ($608) {
            $a$5109$i = $a$6$i;$d$2108$i = $603;
           } else {
            $a$5$lcssa$i = $a$6$i;$d$2$lcssa$i = $603;
            break;
           }
          }
         } else {
          $a$5$lcssa$i = $a$3$lcssa$i;$d$2$lcssa$i = $576;
         }
         $609 = $a$5$lcssa$i;
         $610 = (($482) - ($609))|0;
         $611 = $610 >> 2;
         $612 = ($611*9)|0;
         $613 = HEAP32[$a$5$lcssa$i>>2]|0;
         $614 = ($613>>>0)<(10);
         if ($614) {
          $a$7$i = $a$5$lcssa$i;$d$3$i = $d$2$lcssa$i;$e$3$i = $612;
          break;
         } else {
          $e$2104$i = $612;$i$2103$i = 10;
         }
         while(1) {
          $615 = ($i$2103$i*10)|0;
          $616 = (($e$2104$i) + 1)|0;
          $617 = ($613>>>0)<($615>>>0);
          if ($617) {
           $a$7$i = $a$5$lcssa$i;$d$3$i = $d$2$lcssa$i;$e$3$i = $616;
           break;
          } else {
           $e$2104$i = $616;$i$2103$i = $615;
          }
         }
        }
       } while(0);
       $618 = ((($d$3$i)) + 4|0);
       $619 = ($z$3$lcssa$i>>>0)>($618>>>0);
       $$z$3$i = $619 ? $618 : $z$3$lcssa$i;
       $a$8$ph$i = $a$7$i;$e$4$ph$i = $e$3$i;$z$6$ph$i = $$z$3$i;
      } else {
       $a$8$ph$i = $a$3$lcssa$i;$e$4$ph$i = $e$1$i;$z$6$ph$i = $z$3$lcssa$i;
      }
      $620 = (0 - ($e$4$ph$i))|0;
      $z$6$i = $z$6$ph$i;
      while(1) {
       $621 = ($z$6$i>>>0)>($a$8$ph$i>>>0);
       if (!($621)) {
        $$lcssa159$i = 0;$z$6$i$lcssa = $z$6$i;
        break;
       }
       $622 = ((($z$6$i)) + -4|0);
       $623 = HEAP32[$622>>2]|0;
       $624 = ($623|0)==(0);
       if ($624) {
        $z$6$i = $622;
       } else {
        $$lcssa159$i = 1;$z$6$i$lcssa = $z$6$i;
        break;
       }
      }
      do {
       if ($564) {
        $625 = $565&1;
        $626 = $625 ^ 1;
        $$p$$i = (($626) + ($$p$i))|0;
        $627 = ($$p$$i|0)>($e$4$ph$i|0);
        $628 = ($e$4$ph$i|0)>(-5);
        $or$cond6$i = $627 & $628;
        if ($or$cond6$i) {
         $629 = (($t$0) + -1)|0;
         $$neg53$i = (($$p$$i) + -1)|0;
         $630 = (($$neg53$i) - ($e$4$ph$i))|0;
         $$013$i = $629;$$210$i = $630;
        } else {
         $631 = (($t$0) + -2)|0;
         $632 = (($$p$$i) + -1)|0;
         $$013$i = $631;$$210$i = $632;
        }
        $633 = $fl$1$ & 8;
        $634 = ($633|0)==(0);
        if (!($634)) {
         $$114$i = $$013$i;$$311$i = $$210$i;$$pre$phi184$iZ2D = $633;
         break;
        }
        do {
         if ($$lcssa159$i) {
          $635 = ((($z$6$i$lcssa)) + -4|0);
          $636 = HEAP32[$635>>2]|0;
          $637 = ($636|0)==(0);
          if ($637) {
           $j$2$i = 9;
           break;
          }
          $638 = (($636>>>0) % 10)&-1;
          $639 = ($638|0)==(0);
          if ($639) {
           $i$399$i = 10;$j$1100$i = 0;
          } else {
           $j$2$i = 0;
           break;
          }
          while(1) {
           $640 = ($i$399$i*10)|0;
           $641 = (($j$1100$i) + 1)|0;
           $642 = (($636>>>0) % ($640>>>0))&-1;
           $643 = ($642|0)==(0);
           if ($643) {
            $i$399$i = $640;$j$1100$i = $641;
           } else {
            $j$2$i = $641;
            break;
           }
          }
         } else {
          $j$2$i = 9;
         }
        } while(0);
        $644 = $$013$i | 32;
        $645 = ($644|0)==(102);
        $646 = $z$6$i$lcssa;
        $647 = (($646) - ($482))|0;
        $648 = $647 >> 2;
        $649 = ($648*9)|0;
        $650 = (($649) + -9)|0;
        if ($645) {
         $651 = (($650) - ($j$2$i))|0;
         $652 = ($651|0)<(0);
         $$21$i = $652 ? 0 : $651;
         $653 = ($$210$i|0)<($$21$i|0);
         $$210$$22$i = $653 ? $$210$i : $$21$i;
         $$114$i = $$013$i;$$311$i = $$210$$22$i;$$pre$phi184$iZ2D = 0;
         break;
        } else {
         $654 = (($650) + ($e$4$ph$i))|0;
         $655 = (($654) - ($j$2$i))|0;
         $656 = ($655|0)<(0);
         $$23$i = $656 ? 0 : $655;
         $657 = ($$210$i|0)<($$23$i|0);
         $$210$$24$i = $657 ? $$210$i : $$23$i;
         $$114$i = $$013$i;$$311$i = $$210$$24$i;$$pre$phi184$iZ2D = 0;
         break;
        }
       } else {
        $$pre183$i = $fl$1$ & 8;
        $$114$i = $t$0;$$311$i = $$p$i;$$pre$phi184$iZ2D = $$pre183$i;
       }
      } while(0);
      $658 = $$311$i | $$pre$phi184$iZ2D;
      $659 = ($658|0)!=(0);
      $660 = $659&1;
      $661 = $$114$i | 32;
      $662 = ($661|0)==(102);
      if ($662) {
       $663 = ($e$4$ph$i|0)>(0);
       $664 = $663 ? $e$4$ph$i : 0;
       $$pn$i = $664;$estr$2$i = 0;
      } else {
       $665 = ($e$4$ph$i|0)<(0);
       $666 = $665 ? $620 : $e$4$ph$i;
       $667 = ($666|0)<(0);
       $668 = $667 << 31 >> 31;
       $669 = (_fmt_u($666,$668,$5)|0);
       $670 = $669;
       $671 = (($8) - ($670))|0;
       $672 = ($671|0)<(2);
       if ($672) {
        $estr$193$i = $669;
        while(1) {
         $673 = ((($estr$193$i)) + -1|0);
         HEAP8[$673>>0] = 48;
         $674 = $673;
         $675 = (($8) - ($674))|0;
         $676 = ($675|0)<(2);
         if ($676) {
          $estr$193$i = $673;
         } else {
          $estr$1$lcssa$i = $673;
          break;
         }
        }
       } else {
        $estr$1$lcssa$i = $669;
       }
       $677 = $e$4$ph$i >> 31;
       $678 = $677 & 2;
       $679 = (($678) + 43)|0;
       $680 = $679&255;
       $681 = ((($estr$1$lcssa$i)) + -1|0);
       HEAP8[$681>>0] = $680;
       $682 = $$114$i&255;
       $683 = ((($estr$1$lcssa$i)) + -2|0);
       HEAP8[$683>>0] = $682;
       $684 = $683;
       $685 = (($8) - ($684))|0;
       $$pn$i = $685;$estr$2$i = $683;
      }
      $686 = (($pl$0$i) + 1)|0;
      $687 = (($686) + ($$311$i))|0;
      $l$1$i = (($687) + ($660))|0;
      $688 = (($l$1$i) + ($$pn$i))|0;
      _pad($f,32,$w$1,$688,$fl$1$);
      $689 = HEAP32[$f>>2]|0;
      $690 = $689 & 32;
      $691 = ($690|0)==(0);
      if ($691) {
       (___fwritex($prefix$0$i,$pl$0$i,$f)|0);
      }
      $692 = $fl$1$ ^ 65536;
      _pad($f,48,$w$1,$688,$692);
      do {
       if ($662) {
        $693 = ($a$8$ph$i>>>0)>($$31$i>>>0);
        $r$0$a$8$i = $693 ? $$31$i : $a$8$ph$i;
        $d$482$i = $r$0$a$8$i;
        while(1) {
         $694 = HEAP32[$d$482$i>>2]|0;
         $695 = (_fmt_u($694,0,$13)|0);
         $696 = ($d$482$i|0)==($r$0$a$8$i|0);
         do {
          if ($696) {
           $700 = ($695|0)==($13|0);
           if (!($700)) {
            $s7$1$i = $695;
            break;
           }
           HEAP8[$15>>0] = 48;
           $s7$1$i = $15;
          } else {
           $697 = ($695>>>0)>($buf$i>>>0);
           if ($697) {
            $s7$079$i = $695;
           } else {
            $s7$1$i = $695;
            break;
           }
           while(1) {
            $698 = ((($s7$079$i)) + -1|0);
            HEAP8[$698>>0] = 48;
            $699 = ($698>>>0)>($buf$i>>>0);
            if ($699) {
             $s7$079$i = $698;
            } else {
             $s7$1$i = $698;
             break;
            }
           }
          }
         } while(0);
         $701 = HEAP32[$f>>2]|0;
         $702 = $701 & 32;
         $703 = ($702|0)==(0);
         if ($703) {
          $704 = $s7$1$i;
          $705 = (($14) - ($704))|0;
          (___fwritex($s7$1$i,$705,$f)|0);
         }
         $706 = ((($d$482$i)) + 4|0);
         $707 = ($706>>>0)>($$31$i>>>0);
         if ($707) {
          $$lcssa339 = $706;
          break;
         } else {
          $d$482$i = $706;
         }
        }
        $708 = ($658|0)==(0);
        do {
         if (!($708)) {
          $709 = HEAP32[$f>>2]|0;
          $710 = $709 & 32;
          $711 = ($710|0)==(0);
          if (!($711)) {
           break;
          }
          (___fwritex(67499,1,$f)|0);
         }
        } while(0);
        $712 = ($$lcssa339>>>0)<($z$6$i$lcssa>>>0);
        $713 = ($$311$i|0)>(0);
        $714 = $713 & $712;
        if ($714) {
         $$41276$i = $$311$i;$d$575$i = $$lcssa339;
         while(1) {
          $715 = HEAP32[$d$575$i>>2]|0;
          $716 = (_fmt_u($715,0,$13)|0);
          $717 = ($716>>>0)>($buf$i>>>0);
          if ($717) {
           $s8$070$i = $716;
           while(1) {
            $718 = ((($s8$070$i)) + -1|0);
            HEAP8[$718>>0] = 48;
            $719 = ($718>>>0)>($buf$i>>>0);
            if ($719) {
             $s8$070$i = $718;
            } else {
             $s8$0$lcssa$i = $718;
             break;
            }
           }
          } else {
           $s8$0$lcssa$i = $716;
          }
          $720 = HEAP32[$f>>2]|0;
          $721 = $720 & 32;
          $722 = ($721|0)==(0);
          if ($722) {
           $723 = ($$41276$i|0)>(9);
           $724 = $723 ? 9 : $$41276$i;
           (___fwritex($s8$0$lcssa$i,$724,$f)|0);
          }
          $725 = ((($d$575$i)) + 4|0);
          $726 = (($$41276$i) + -9)|0;
          $727 = ($725>>>0)<($z$6$i$lcssa>>>0);
          $728 = ($$41276$i|0)>(9);
          $729 = $728 & $727;
          if ($729) {
           $$41276$i = $726;$d$575$i = $725;
          } else {
           $$412$lcssa$i = $726;
           break;
          }
         }
        } else {
         $$412$lcssa$i = $$311$i;
        }
        $730 = (($$412$lcssa$i) + 9)|0;
        _pad($f,48,$730,9,0);
       } else {
        $731 = ((($a$8$ph$i)) + 4|0);
        $z$6$$i = $$lcssa159$i ? $z$6$i$lcssa : $731;
        $732 = ($$311$i|0)>(-1);
        if ($732) {
         $733 = ($$pre$phi184$iZ2D|0)==(0);
         $$587$i = $$311$i;$d$686$i = $a$8$ph$i;
         while(1) {
          $734 = HEAP32[$d$686$i>>2]|0;
          $735 = (_fmt_u($734,0,$13)|0);
          $736 = ($735|0)==($13|0);
          if ($736) {
           HEAP8[$15>>0] = 48;
           $s9$0$i = $15;
          } else {
           $s9$0$i = $735;
          }
          $737 = ($d$686$i|0)==($a$8$ph$i|0);
          do {
           if ($737) {
            $741 = ((($s9$0$i)) + 1|0);
            $742 = HEAP32[$f>>2]|0;
            $743 = $742 & 32;
            $744 = ($743|0)==(0);
            if ($744) {
             (___fwritex($s9$0$i,1,$f)|0);
            }
            $745 = ($$587$i|0)<(1);
            $or$cond29$i = $733 & $745;
            if ($or$cond29$i) {
             $s9$2$i = $741;
             break;
            }
            $746 = HEAP32[$f>>2]|0;
            $747 = $746 & 32;
            $748 = ($747|0)==(0);
            if (!($748)) {
             $s9$2$i = $741;
             break;
            }
            (___fwritex(67499,1,$f)|0);
            $s9$2$i = $741;
           } else {
            $738 = ($s9$0$i>>>0)>($buf$i>>>0);
            if ($738) {
             $s9$183$i = $s9$0$i;
            } else {
             $s9$2$i = $s9$0$i;
             break;
            }
            while(1) {
             $739 = ((($s9$183$i)) + -1|0);
             HEAP8[$739>>0] = 48;
             $740 = ($739>>>0)>($buf$i>>>0);
             if ($740) {
              $s9$183$i = $739;
             } else {
              $s9$2$i = $739;
              break;
             }
            }
           }
          } while(0);
          $749 = $s9$2$i;
          $750 = (($14) - ($749))|0;
          $751 = HEAP32[$f>>2]|0;
          $752 = $751 & 32;
          $753 = ($752|0)==(0);
          if ($753) {
           $754 = ($$587$i|0)>($750|0);
           $755 = $754 ? $750 : $$587$i;
           (___fwritex($s9$2$i,$755,$f)|0);
          }
          $756 = (($$587$i) - ($750))|0;
          $757 = ((($d$686$i)) + 4|0);
          $758 = ($757>>>0)<($z$6$$i>>>0);
          $759 = ($756|0)>(-1);
          $760 = $758 & $759;
          if ($760) {
           $$587$i = $756;$d$686$i = $757;
          } else {
           $$5$lcssa$i = $756;
           break;
          }
         }
        } else {
         $$5$lcssa$i = $$311$i;
        }
        $761 = (($$5$lcssa$i) + 18)|0;
        _pad($f,48,$761,18,0);
        $762 = HEAP32[$f>>2]|0;
        $763 = $762 & 32;
        $764 = ($763|0)==(0);
        if (!($764)) {
         break;
        }
        $765 = $estr$2$i;
        $766 = (($8) - ($765))|0;
        (___fwritex($estr$2$i,$766,$f)|0);
       }
      } while(0);
      $767 = $fl$1$ ^ 8192;
      _pad($f,32,$w$1,$688,$767);
      $768 = ($688|0)<($w$1|0);
      $w$30$i = $768 ? $w$1 : $688;
      $$0$i = $w$30$i;
     } else {
      $376 = $t$0 & 32;
      $377 = ($376|0)!=(0);
      $378 = $377 ? 67483 : 67487;
      $379 = ($$07$i != $$07$i) | (0.0 != 0.0);
      $380 = $377 ? 67491 : 67495;
      $pl$1$i = $379 ? 0 : $pl$0$i;
      $s1$0$i = $379 ? $380 : $378;
      $381 = (($pl$1$i) + 3)|0;
      _pad($f,32,$w$1,$381,$175);
      $382 = HEAP32[$f>>2]|0;
      $383 = $382 & 32;
      $384 = ($383|0)==(0);
      if ($384) {
       (___fwritex($prefix$0$i,$pl$1$i,$f)|0);
       $$pre$i = HEAP32[$f>>2]|0;
       $386 = $$pre$i;
      } else {
       $386 = $382;
      }
      $385 = $386 & 32;
      $387 = ($385|0)==(0);
      if ($387) {
       (___fwritex($s1$0$i,3,$f)|0);
      }
      $388 = $fl$1$ ^ 8192;
      _pad($f,32,$w$1,$381,$388);
      $389 = ($381|0)<($w$1|0);
      $390 = $389 ? $w$1 : $381;
      $$0$i = $390;
     }
    } while(0);
    $cnt$0 = $cnt$1;$fmt41 = $$lcssa323;$l$0 = $$0$i;$l10n$0 = $l10n$3;
    continue L1;
    break;
   }
   default: {
    $a$2 = $fmt41;$fl$6 = $fl$1$;$p$5 = $p$0;$pl$2 = 0;$prefix$2 = 67447;$z$2 = $1;
   }
   }
  } while(0);
  L313: do {
   if ((label|0) == 64) {
    label = 0;
    $206 = $arg;
    $207 = $206;
    $208 = HEAP32[$207>>2]|0;
    $209 = (($206) + 4)|0;
    $210 = $209;
    $211 = HEAP32[$210>>2]|0;
    $212 = $t$1 & 32;
    $213 = ($208|0)==(0);
    $214 = ($211|0)==(0);
    $215 = $213 & $214;
    if ($215) {
     $a$0 = $1;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 67447;
     label = 77;
    } else {
     $$012$i = $1;$217 = $208;$224 = $211;
     while(1) {
      $216 = $217 & 15;
      $218 = (67431 + ($216)|0);
      $219 = HEAP8[$218>>0]|0;
      $220 = $219&255;
      $221 = $220 | $212;
      $222 = $221&255;
      $223 = ((($$012$i)) + -1|0);
      HEAP8[$223>>0] = $222;
      $225 = (_bitshift64Lshr(($217|0),($224|0),4)|0);
      $226 = tempRet0;
      $227 = ($225|0)==(0);
      $228 = ($226|0)==(0);
      $229 = $227 & $228;
      if ($229) {
       $$lcssa344 = $223;
       break;
      } else {
       $$012$i = $223;$217 = $225;$224 = $226;
      }
     }
     $230 = $arg;
     $231 = $230;
     $232 = HEAP32[$231>>2]|0;
     $233 = (($230) + 4)|0;
     $234 = $233;
     $235 = HEAP32[$234>>2]|0;
     $236 = ($232|0)==(0);
     $237 = ($235|0)==(0);
     $238 = $236 & $237;
     $239 = $fl$3 & 8;
     $240 = ($239|0)==(0);
     $or$cond17 = $240 | $238;
     if ($or$cond17) {
      $a$0 = $$lcssa344;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 67447;
      label = 77;
     } else {
      $241 = $t$1 >> 4;
      $242 = (67447 + ($241)|0);
      $a$0 = $$lcssa344;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 2;$prefix$1 = $242;
      label = 77;
     }
    }
   }
   else if ((label|0) == 76) {
    label = 0;
    $288 = (_fmt_u($286,$287,$1)|0);
    $a$0 = $288;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $pl$0;$prefix$1 = $prefix$0;
    label = 77;
   }
   else if ((label|0) == 82) {
    label = 0;
    $320 = (_memchr($a$1,0,$p$0)|0);
    $321 = ($320|0)==(0|0);
    $322 = $320;
    $323 = $a$1;
    $324 = (($322) - ($323))|0;
    $325 = (($a$1) + ($p$0)|0);
    $z$1 = $321 ? $325 : $320;
    $p$3 = $321 ? $p$0 : $324;
    $a$2 = $a$1;$fl$6 = $175;$p$5 = $p$3;$pl$2 = 0;$prefix$2 = 67447;$z$2 = $z$1;
   }
   else if ((label|0) == 86) {
    label = 0;
    $333 = HEAP32[$arg>>2]|0;
    $i$0114 = 0;$l$1113 = 0;$ws$0115 = $333;
    while(1) {
     $334 = HEAP32[$ws$0115>>2]|0;
     $335 = ($334|0)==(0);
     if ($335) {
      $i$0$lcssa = $i$0114;$l$2 = $l$1113;
      break;
     }
     $336 = (_wctomb($mb,$334)|0);
     $337 = ($336|0)<(0);
     $338 = (($p$4198) - ($i$0114))|0;
     $339 = ($336>>>0)>($338>>>0);
     $or$cond20 = $337 | $339;
     if ($or$cond20) {
      $i$0$lcssa = $i$0114;$l$2 = $336;
      break;
     }
     $340 = ((($ws$0115)) + 4|0);
     $341 = (($336) + ($i$0114))|0;
     $342 = ($p$4198>>>0)>($341>>>0);
     if ($342) {
      $i$0114 = $341;$l$1113 = $336;$ws$0115 = $340;
     } else {
      $i$0$lcssa = $341;$l$2 = $336;
      break;
     }
    }
    $343 = ($l$2|0)<(0);
    if ($343) {
     $$0 = -1;
     break L1;
    }
    _pad($f,32,$w$1,$i$0$lcssa,$fl$1$);
    $344 = ($i$0$lcssa|0)==(0);
    if ($344) {
     $i$0$lcssa200 = 0;
     label = 98;
    } else {
     $345 = HEAP32[$arg>>2]|0;
     $i$1125 = 0;$ws$1126 = $345;
     while(1) {
      $346 = HEAP32[$ws$1126>>2]|0;
      $347 = ($346|0)==(0);
      if ($347) {
       $i$0$lcssa200 = $i$0$lcssa;
       label = 98;
       break L313;
      }
      $348 = ((($ws$1126)) + 4|0);
      $349 = (_wctomb($mb,$346)|0);
      $350 = (($349) + ($i$1125))|0;
      $351 = ($350|0)>($i$0$lcssa|0);
      if ($351) {
       $i$0$lcssa200 = $i$0$lcssa;
       label = 98;
       break L313;
      }
      $352 = HEAP32[$f>>2]|0;
      $353 = $352 & 32;
      $354 = ($353|0)==(0);
      if ($354) {
       (___fwritex($mb,$349,$f)|0);
      }
      $355 = ($350>>>0)<($i$0$lcssa>>>0);
      if ($355) {
       $i$1125 = $350;$ws$1126 = $348;
      } else {
       $i$0$lcssa200 = $i$0$lcssa;
       label = 98;
       break;
      }
     }
    }
   }
  } while(0);
  if ((label|0) == 98) {
   label = 0;
   $356 = $fl$1$ ^ 8192;
   _pad($f,32,$w$1,$i$0$lcssa200,$356);
   $357 = ($w$1|0)>($i$0$lcssa200|0);
   $358 = $357 ? $w$1 : $i$0$lcssa200;
   $cnt$0 = $cnt$1;$fmt41 = $$lcssa323;$l$0 = $358;$l10n$0 = $l10n$3;
   continue;
  }
  if ((label|0) == 77) {
   label = 0;
   $289 = ($p$2|0)>(-1);
   $290 = $fl$4 & -65537;
   $$fl$4 = $289 ? $290 : $fl$4;
   $291 = $arg;
   $292 = $291;
   $293 = HEAP32[$292>>2]|0;
   $294 = (($291) + 4)|0;
   $295 = $294;
   $296 = HEAP32[$295>>2]|0;
   $297 = ($293|0)!=(0);
   $298 = ($296|0)!=(0);
   $299 = $297 | $298;
   $300 = ($p$2|0)!=(0);
   $or$cond = $300 | $299;
   if ($or$cond) {
    $301 = $a$0;
    $302 = (($2) - ($301))|0;
    $303 = $299&1;
    $304 = $303 ^ 1;
    $305 = (($304) + ($302))|0;
    $306 = ($p$2|0)>($305|0);
    $p$2$ = $306 ? $p$2 : $305;
    $a$2 = $a$0;$fl$6 = $$fl$4;$p$5 = $p$2$;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $1;
   } else {
    $a$2 = $1;$fl$6 = $$fl$4;$p$5 = 0;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $1;
   }
  }
  $769 = $z$2;
  $770 = $a$2;
  $771 = (($769) - ($770))|0;
  $772 = ($p$5|0)<($771|0);
  $$p$5 = $772 ? $771 : $p$5;
  $773 = (($pl$2) + ($$p$5))|0;
  $774 = ($w$1|0)<($773|0);
  $w$2 = $774 ? $773 : $w$1;
  _pad($f,32,$w$2,$773,$fl$6);
  $775 = HEAP32[$f>>2]|0;
  $776 = $775 & 32;
  $777 = ($776|0)==(0);
  if ($777) {
   (___fwritex($prefix$2,$pl$2,$f)|0);
  }
  $778 = $fl$6 ^ 65536;
  _pad($f,48,$w$2,$773,$778);
  _pad($f,48,$$p$5,$771,0);
  $779 = HEAP32[$f>>2]|0;
  $780 = $779 & 32;
  $781 = ($780|0)==(0);
  if ($781) {
   (___fwritex($a$2,$771,$f)|0);
  }
  $782 = $fl$6 ^ 8192;
  _pad($f,32,$w$2,$773,$782);
  $cnt$0 = $cnt$1;$fmt41 = $$lcssa323;$l$0 = $w$2;$l10n$0 = $l10n$3;
 }
 L348: do {
  if ((label|0) == 245) {
   $783 = ($f|0)==(0|0);
   if ($783) {
    $784 = ($l10n$0$lcssa|0)==(0);
    if ($784) {
     $$0 = 0;
    } else {
     $i$2100 = 1;
     while(1) {
      $785 = (($nl_type) + ($i$2100<<2)|0);
      $786 = HEAP32[$785>>2]|0;
      $787 = ($786|0)==(0);
      if ($787) {
       $i$2100$lcssa = $i$2100;
       break;
      }
      $789 = (($nl_arg) + ($i$2100<<3)|0);
      _pop_arg($789,$786,$ap);
      $790 = (($i$2100) + 1)|0;
      $791 = ($790|0)<(10);
      if ($791) {
       $i$2100 = $790;
      } else {
       $$0 = 1;
       break L348;
      }
     }
     $788 = ($i$2100$lcssa|0)<(10);
     if ($788) {
      $i$398 = $i$2100$lcssa;
      while(1) {
       $794 = (($nl_type) + ($i$398<<2)|0);
       $795 = HEAP32[$794>>2]|0;
       $796 = ($795|0)==(0);
       $792 = (($i$398) + 1)|0;
       if (!($796)) {
        $$0 = -1;
        break L348;
       }
       $793 = ($792|0)<(10);
       if ($793) {
        $i$398 = $792;
       } else {
        $$0 = 1;
        break;
       }
      }
     } else {
      $$0 = 1;
     }
    }
   } else {
    $$0 = $cnt$1$lcssa;
   }
  }
 } while(0);
 STACKTOP = sp;return ($$0|0);
}
function _do_read($f,$buf,$len) {
 $f = $f|0;
 $buf = $buf|0;
 $len = $len|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___string_read($f,$buf,$len)|0);
 return ($0|0);
}
function _cleanup521($p) {
 $p = $p|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($p)) + 68|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0);
 if ($2) {
  ___unlockfile($p);
 }
 return;
}
function _cleanup526($p) {
 $p = $p|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($p)) + 68|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0);
 if ($2) {
  ___unlockfile($p);
 }
 return;
}
function _pop_arg($arg,$type,$ap) {
 $arg = $arg|0;
 $type = $type|0;
 $ap = $ap|0;
 var $$mask = 0, $$mask1 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0.0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0.0;
 var $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0;
 var $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0;
 var $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $arglist_current = 0, $arglist_current11 = 0, $arglist_current14 = 0, $arglist_current17 = 0;
 var $arglist_current2 = 0, $arglist_current20 = 0, $arglist_current23 = 0, $arglist_current26 = 0, $arglist_current5 = 0, $arglist_current8 = 0, $arglist_next = 0, $arglist_next12 = 0, $arglist_next15 = 0, $arglist_next18 = 0, $arglist_next21 = 0, $arglist_next24 = 0, $arglist_next27 = 0, $arglist_next3 = 0, $arglist_next6 = 0, $arglist_next9 = 0, $expanded = 0, $expanded28 = 0, $expanded30 = 0, $expanded31 = 0;
 var $expanded32 = 0, $expanded34 = 0, $expanded35 = 0, $expanded37 = 0, $expanded38 = 0, $expanded39 = 0, $expanded41 = 0, $expanded42 = 0, $expanded44 = 0, $expanded45 = 0, $expanded46 = 0, $expanded48 = 0, $expanded49 = 0, $expanded51 = 0, $expanded52 = 0, $expanded53 = 0, $expanded55 = 0, $expanded56 = 0, $expanded58 = 0, $expanded59 = 0;
 var $expanded60 = 0, $expanded62 = 0, $expanded63 = 0, $expanded65 = 0, $expanded66 = 0, $expanded67 = 0, $expanded69 = 0, $expanded70 = 0, $expanded72 = 0, $expanded73 = 0, $expanded74 = 0, $expanded76 = 0, $expanded77 = 0, $expanded79 = 0, $expanded80 = 0, $expanded81 = 0, $expanded83 = 0, $expanded84 = 0, $expanded86 = 0, $expanded87 = 0;
 var $expanded88 = 0, $expanded90 = 0, $expanded91 = 0, $expanded93 = 0, $expanded94 = 0, $expanded95 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($type>>>0)>(20);
 L1: do {
  if (!($0)) {
   do {
    switch ($type|0) {
    case 9:  {
     $arglist_current = HEAP32[$ap>>2]|0;
     $1 = $arglist_current;
     $2 = ((0) + 4|0);
     $expanded28 = $2;
     $expanded = (($expanded28) - 1)|0;
     $3 = (($1) + ($expanded))|0;
     $4 = ((0) + 4|0);
     $expanded32 = $4;
     $expanded31 = (($expanded32) - 1)|0;
     $expanded30 = $expanded31 ^ -1;
     $5 = $3 & $expanded30;
     $6 = $5;
     $7 = HEAP32[$6>>2]|0;
     $arglist_next = ((($6)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next;
     HEAP32[$arg>>2] = $7;
     break L1;
     break;
    }
    case 10:  {
     $arglist_current2 = HEAP32[$ap>>2]|0;
     $8 = $arglist_current2;
     $9 = ((0) + 4|0);
     $expanded35 = $9;
     $expanded34 = (($expanded35) - 1)|0;
     $10 = (($8) + ($expanded34))|0;
     $11 = ((0) + 4|0);
     $expanded39 = $11;
     $expanded38 = (($expanded39) - 1)|0;
     $expanded37 = $expanded38 ^ -1;
     $12 = $10 & $expanded37;
     $13 = $12;
     $14 = HEAP32[$13>>2]|0;
     $arglist_next3 = ((($13)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next3;
     $15 = ($14|0)<(0);
     $16 = $15 << 31 >> 31;
     $17 = $arg;
     $18 = $17;
     HEAP32[$18>>2] = $14;
     $19 = (($17) + 4)|0;
     $20 = $19;
     HEAP32[$20>>2] = $16;
     break L1;
     break;
    }
    case 11:  {
     $arglist_current5 = HEAP32[$ap>>2]|0;
     $21 = $arglist_current5;
     $22 = ((0) + 4|0);
     $expanded42 = $22;
     $expanded41 = (($expanded42) - 1)|0;
     $23 = (($21) + ($expanded41))|0;
     $24 = ((0) + 4|0);
     $expanded46 = $24;
     $expanded45 = (($expanded46) - 1)|0;
     $expanded44 = $expanded45 ^ -1;
     $25 = $23 & $expanded44;
     $26 = $25;
     $27 = HEAP32[$26>>2]|0;
     $arglist_next6 = ((($26)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next6;
     $28 = $arg;
     $29 = $28;
     HEAP32[$29>>2] = $27;
     $30 = (($28) + 4)|0;
     $31 = $30;
     HEAP32[$31>>2] = 0;
     break L1;
     break;
    }
    case 12:  {
     $arglist_current8 = HEAP32[$ap>>2]|0;
     $32 = $arglist_current8;
     $33 = ((0) + 8|0);
     $expanded49 = $33;
     $expanded48 = (($expanded49) - 1)|0;
     $34 = (($32) + ($expanded48))|0;
     $35 = ((0) + 8|0);
     $expanded53 = $35;
     $expanded52 = (($expanded53) - 1)|0;
     $expanded51 = $expanded52 ^ -1;
     $36 = $34 & $expanded51;
     $37 = $36;
     $38 = $37;
     $39 = $38;
     $40 = HEAP32[$39>>2]|0;
     $41 = (($38) + 4)|0;
     $42 = $41;
     $43 = HEAP32[$42>>2]|0;
     $arglist_next9 = ((($37)) + 8|0);
     HEAP32[$ap>>2] = $arglist_next9;
     $44 = $arg;
     $45 = $44;
     HEAP32[$45>>2] = $40;
     $46 = (($44) + 4)|0;
     $47 = $46;
     HEAP32[$47>>2] = $43;
     break L1;
     break;
    }
    case 13:  {
     $arglist_current11 = HEAP32[$ap>>2]|0;
     $48 = $arglist_current11;
     $49 = ((0) + 4|0);
     $expanded56 = $49;
     $expanded55 = (($expanded56) - 1)|0;
     $50 = (($48) + ($expanded55))|0;
     $51 = ((0) + 4|0);
     $expanded60 = $51;
     $expanded59 = (($expanded60) - 1)|0;
     $expanded58 = $expanded59 ^ -1;
     $52 = $50 & $expanded58;
     $53 = $52;
     $54 = HEAP32[$53>>2]|0;
     $arglist_next12 = ((($53)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next12;
     $55 = $54&65535;
     $56 = $55 << 16 >> 16;
     $57 = ($56|0)<(0);
     $58 = $57 << 31 >> 31;
     $59 = $arg;
     $60 = $59;
     HEAP32[$60>>2] = $56;
     $61 = (($59) + 4)|0;
     $62 = $61;
     HEAP32[$62>>2] = $58;
     break L1;
     break;
    }
    case 14:  {
     $arglist_current14 = HEAP32[$ap>>2]|0;
     $63 = $arglist_current14;
     $64 = ((0) + 4|0);
     $expanded63 = $64;
     $expanded62 = (($expanded63) - 1)|0;
     $65 = (($63) + ($expanded62))|0;
     $66 = ((0) + 4|0);
     $expanded67 = $66;
     $expanded66 = (($expanded67) - 1)|0;
     $expanded65 = $expanded66 ^ -1;
     $67 = $65 & $expanded65;
     $68 = $67;
     $69 = HEAP32[$68>>2]|0;
     $arglist_next15 = ((($68)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next15;
     $$mask1 = $69 & 65535;
     $70 = $arg;
     $71 = $70;
     HEAP32[$71>>2] = $$mask1;
     $72 = (($70) + 4)|0;
     $73 = $72;
     HEAP32[$73>>2] = 0;
     break L1;
     break;
    }
    case 15:  {
     $arglist_current17 = HEAP32[$ap>>2]|0;
     $74 = $arglist_current17;
     $75 = ((0) + 4|0);
     $expanded70 = $75;
     $expanded69 = (($expanded70) - 1)|0;
     $76 = (($74) + ($expanded69))|0;
     $77 = ((0) + 4|0);
     $expanded74 = $77;
     $expanded73 = (($expanded74) - 1)|0;
     $expanded72 = $expanded73 ^ -1;
     $78 = $76 & $expanded72;
     $79 = $78;
     $80 = HEAP32[$79>>2]|0;
     $arglist_next18 = ((($79)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next18;
     $81 = $80&255;
     $82 = $81 << 24 >> 24;
     $83 = ($82|0)<(0);
     $84 = $83 << 31 >> 31;
     $85 = $arg;
     $86 = $85;
     HEAP32[$86>>2] = $82;
     $87 = (($85) + 4)|0;
     $88 = $87;
     HEAP32[$88>>2] = $84;
     break L1;
     break;
    }
    case 16:  {
     $arglist_current20 = HEAP32[$ap>>2]|0;
     $89 = $arglist_current20;
     $90 = ((0) + 4|0);
     $expanded77 = $90;
     $expanded76 = (($expanded77) - 1)|0;
     $91 = (($89) + ($expanded76))|0;
     $92 = ((0) + 4|0);
     $expanded81 = $92;
     $expanded80 = (($expanded81) - 1)|0;
     $expanded79 = $expanded80 ^ -1;
     $93 = $91 & $expanded79;
     $94 = $93;
     $95 = HEAP32[$94>>2]|0;
     $arglist_next21 = ((($94)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next21;
     $$mask = $95 & 255;
     $96 = $arg;
     $97 = $96;
     HEAP32[$97>>2] = $$mask;
     $98 = (($96) + 4)|0;
     $99 = $98;
     HEAP32[$99>>2] = 0;
     break L1;
     break;
    }
    case 17:  {
     $arglist_current23 = HEAP32[$ap>>2]|0;
     $100 = $arglist_current23;
     $101 = ((0) + 8|0);
     $expanded84 = $101;
     $expanded83 = (($expanded84) - 1)|0;
     $102 = (($100) + ($expanded83))|0;
     $103 = ((0) + 8|0);
     $expanded88 = $103;
     $expanded87 = (($expanded88) - 1)|0;
     $expanded86 = $expanded87 ^ -1;
     $104 = $102 & $expanded86;
     $105 = $104;
     $106 = +HEAPF64[$105>>3];
     $arglist_next24 = ((($105)) + 8|0);
     HEAP32[$ap>>2] = $arglist_next24;
     HEAPF64[$arg>>3] = $106;
     break L1;
     break;
    }
    case 18:  {
     $arglist_current26 = HEAP32[$ap>>2]|0;
     $107 = $arglist_current26;
     $108 = ((0) + 8|0);
     $expanded91 = $108;
     $expanded90 = (($expanded91) - 1)|0;
     $109 = (($107) + ($expanded90))|0;
     $110 = ((0) + 8|0);
     $expanded95 = $110;
     $expanded94 = (($expanded95) - 1)|0;
     $expanded93 = $expanded94 ^ -1;
     $111 = $109 & $expanded93;
     $112 = $111;
     $113 = +HEAPF64[$112>>3];
     $arglist_next27 = ((($112)) + 8|0);
     HEAP32[$ap>>2] = $arglist_next27;
     HEAPF64[$arg>>3] = $113;
     break L1;
     break;
    }
    default: {
     break L1;
    }
    }
   } while(0);
  }
 } while(0);
 return;
}
function _fmt_u($0,$1,$s) {
 $0 = $0|0;
 $1 = $1|0;
 $s = $s|0;
 var $$0$lcssa = 0, $$01$lcssa$off0 = 0, $$05 = 0, $$1$lcssa = 0, $$12 = 0, $$lcssa20 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $y$03 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ($1>>>0)>(0);
 $3 = ($0>>>0)>(4294967295);
 $4 = ($1|0)==(0);
 $5 = $4 & $3;
 $6 = $2 | $5;
 if ($6) {
  $$05 = $s;$7 = $0;$8 = $1;
  while(1) {
   $9 = (___uremdi3(($7|0),($8|0),10,0)|0);
   $10 = tempRet0;
   $11 = $9 | 48;
   $12 = $11&255;
   $13 = ((($$05)) + -1|0);
   HEAP8[$13>>0] = $12;
   $14 = (___udivdi3(($7|0),($8|0),10,0)|0);
   $15 = tempRet0;
   $16 = ($8>>>0)>(9);
   $17 = ($7>>>0)>(4294967295);
   $18 = ($8|0)==(9);
   $19 = $18 & $17;
   $20 = $16 | $19;
   if ($20) {
    $$05 = $13;$7 = $14;$8 = $15;
   } else {
    $$lcssa20 = $13;$28 = $14;$29 = $15;
    break;
   }
  }
  $$0$lcssa = $$lcssa20;$$01$lcssa$off0 = $28;
 } else {
  $$0$lcssa = $s;$$01$lcssa$off0 = $0;
 }
 $21 = ($$01$lcssa$off0|0)==(0);
 if ($21) {
  $$1$lcssa = $$0$lcssa;
 } else {
  $$12 = $$0$lcssa;$y$03 = $$01$lcssa$off0;
  while(1) {
   $22 = (($y$03>>>0) % 10)&-1;
   $23 = $22 | 48;
   $24 = $23&255;
   $25 = ((($$12)) + -1|0);
   HEAP8[$25>>0] = $24;
   $26 = (($y$03>>>0) / 10)&-1;
   $27 = ($y$03>>>0)<(10);
   if ($27) {
    $$1$lcssa = $25;
    break;
   } else {
    $$12 = $25;$y$03 = $26;
   }
  }
 }
 return ($$1$lcssa|0);
}
function _pad($f,$c,$w,$l,$fl) {
 $f = $f|0;
 $c = $c|0;
 $w = $w|0;
 $l = $l|0;
 $fl = $fl|0;
 var $$0$lcssa6 = 0, $$02 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $or$cond = 0, $pad = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 256|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $pad = sp;
 $0 = $fl & 73728;
 $1 = ($0|0)==(0);
 $2 = ($w|0)>($l|0);
 $or$cond = $2 & $1;
 do {
  if ($or$cond) {
   $3 = (($w) - ($l))|0;
   $4 = ($3>>>0)>(256);
   $5 = $4 ? 256 : $3;
   _memset(($pad|0),($c|0),($5|0))|0;
   $6 = ($3>>>0)>(255);
   $7 = HEAP32[$f>>2]|0;
   $8 = $7 & 32;
   $9 = ($8|0)==(0);
   if ($6) {
    $10 = (($w) - ($l))|0;
    $$02 = $3;$17 = $7;$18 = $9;
    while(1) {
     if ($18) {
      (___fwritex($pad,256,$f)|0);
      $$pre = HEAP32[$f>>2]|0;
      $14 = $$pre;
     } else {
      $14 = $17;
     }
     $11 = (($$02) + -256)|0;
     $12 = ($11>>>0)>(255);
     $13 = $14 & 32;
     $15 = ($13|0)==(0);
     if ($12) {
      $$02 = $11;$17 = $14;$18 = $15;
     } else {
      break;
     }
    }
    $16 = $10 & 255;
    if ($15) {
     $$0$lcssa6 = $16;
    } else {
     break;
    }
   } else {
    if ($9) {
     $$0$lcssa6 = $3;
    } else {
     break;
    }
   }
   (___fwritex($pad,$$0$lcssa6,$f)|0);
  }
 } while(0);
 STACKTOP = sp;return;
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$3$i = 0, $$lcssa = 0, $$lcssa211 = 0, $$lcssa215 = 0, $$lcssa216 = 0, $$lcssa217 = 0, $$lcssa219 = 0, $$lcssa222 = 0, $$lcssa224 = 0, $$lcssa226 = 0, $$lcssa228 = 0, $$lcssa230 = 0, $$lcssa232 = 0, $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i22$i = 0, $$pre$i25 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i23$iZ2D = 0;
 var $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi58$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre105 = 0, $$pre106 = 0, $$pre14$i$i = 0, $$pre43$i = 0, $$pre56$i$i = 0, $$pre57$i$i = 0, $$pre8$i = 0, $$rsize$0$i = 0, $$rsize$3$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0, $$sum$i13$i = 0, $$sum$i14$i = 0, $$sum$i17$i = 0, $$sum$i19$i = 0;
 var $$sum$i2334 = 0, $$sum$i32 = 0, $$sum$i35 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0, $$sum1$i15$i = 0, $$sum1$i20$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0, $$sum10$i$i = 0, $$sum11$i = 0, $$sum11$i$i = 0, $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum116$i = 0;
 var $$sum117$i = 0, $$sum118$i = 0, $$sum119$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum120$i = 0, $$sum121$i = 0, $$sum122$i = 0, $$sum123$i = 0, $$sum124$i = 0, $$sum125$i = 0, $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0, $$sum15$i = 0, $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0, $$sum17$i$i = 0;
 var $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0, $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i16$i = 0, $$sum2$i18$i = 0, $$sum2$i21$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0, $$sum22$i$i = 0, $$sum23$i$i = 0, $$sum24$i$i = 0, $$sum25$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0, $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i27 = 0;
 var $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0, $$sum41$i$i = 0, $$sum42$i$i = 0, $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0, $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0;
 var $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0;
 var $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0;
 var $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0;
 var $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0;
 var $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0;
 var $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0;
 var $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0;
 var $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0;
 var $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0;
 var $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0;
 var $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0;
 var $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0;
 var $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0;
 var $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0;
 var $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0;
 var $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0;
 var $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0;
 var $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0;
 var $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0;
 var $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0;
 var $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0;
 var $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0;
 var $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0;
 var $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0;
 var $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0;
 var $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0;
 var $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0;
 var $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0;
 var $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0;
 var $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0;
 var $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0;
 var $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0;
 var $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0;
 var $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0;
 var $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0;
 var $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0;
 var $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0;
 var $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0;
 var $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0;
 var $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0;
 var $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0;
 var $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0;
 var $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0;
 var $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0;
 var $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0;
 var $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0;
 var $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0;
 var $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0;
 var $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0;
 var $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0;
 var $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0;
 var $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0;
 var $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0;
 var $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0;
 var $F5$0$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$029$i = 0, $K2$07$i$i = 0, $K8$051$i$i = 0, $R$0$i = 0, $R$0$i$i = 0, $R$0$i$i$lcssa = 0, $R$0$i$lcssa = 0, $R$0$i18 = 0, $R$0$i18$lcssa = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i$i$lcssa = 0, $RP$0$i$lcssa = 0;
 var $RP$0$i17 = 0, $RP$0$i17$lcssa = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i25$i = 0, $T$028$i = 0, $T$028$i$lcssa = 0, $T$050$i$i = 0, $T$050$i$i$lcssa = 0, $T$06$i$i = 0, $T$06$i$i$lcssa = 0, $br$0$ph$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i21 = 0, $exitcond$i$i = 0, $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0;
 var $not$$i = 0, $not$$i$i = 0, $not$$i26$i = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i30 = 0, $or$cond1$i = 0, $or$cond19$i = 0, $or$cond2$i = 0, $or$cond3$i = 0, $or$cond5$i = 0, $or$cond57$i = 0, $or$cond6$i = 0, $or$cond8$i = 0, $or$cond9$i = 0, $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i$lcssa = 0, $rsize$0$i15 = 0, $rsize$1$i = 0;
 var $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$084$i = 0, $sp$084$i$lcssa = 0, $sp$183$i = 0, $sp$183$i$lcssa = 0, $ssize$0$$i = 0, $ssize$0$i = 0, $ssize$1$ph$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0, $t$1$i = 0, $t$2$ph$i = 0;
 var $t$2$v$3$i = 0, $t$230$i = 0, $tbase$255$i = 0, $tsize$0$ph$i = 0, $tsize$0323944$i = 0, $tsize$1$i = 0, $tsize$254$i = 0, $v$0$i = 0, $v$0$i$lcssa = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0, $v$3$ph$i = 0, $v$332$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   $2 = (($bytes) + 11)|0;
   $3 = $2 & -8;
   $4 = $1 ? 16 : $3;
   $5 = $4 >>> 3;
   $6 = HEAP32[57128>>2]|0;
   $7 = $6 >>> $5;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($5))|0;
    $13 = $12 << 1;
    $14 = (57168 + ($13<<2)|0);
    $$sum10 = (($13) + 2)|0;
    $15 = (57168 + ($$sum10<<2)|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = ((($16)) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[57128>>2] = $22;
     } else {
      $23 = HEAP32[(57144)>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = ((($18)) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = ((($16)) + 4|0);
    HEAP32[$30>>2] = $29;
    $$sum1112 = $28 | 4;
    $31 = (($16) + ($$sum1112)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $32 | 1;
    HEAP32[$31>>2] = $33;
    $mem$0 = $17;
    return ($mem$0|0);
   }
   $34 = HEAP32[(57136)>>2]|0;
   $35 = ($4>>>0)>($34>>>0);
   if ($35) {
    $36 = ($7|0)==(0);
    if (!($36)) {
     $37 = $7 << $5;
     $38 = 2 << $5;
     $39 = (0 - ($38))|0;
     $40 = $38 | $39;
     $41 = $37 & $40;
     $42 = (0 - ($41))|0;
     $43 = $41 & $42;
     $44 = (($43) + -1)|0;
     $45 = $44 >>> 12;
     $46 = $45 & 16;
     $47 = $44 >>> $46;
     $48 = $47 >>> 5;
     $49 = $48 & 8;
     $50 = $49 | $46;
     $51 = $47 >>> $49;
     $52 = $51 >>> 2;
     $53 = $52 & 4;
     $54 = $50 | $53;
     $55 = $51 >>> $53;
     $56 = $55 >>> 1;
     $57 = $56 & 2;
     $58 = $54 | $57;
     $59 = $55 >>> $57;
     $60 = $59 >>> 1;
     $61 = $60 & 1;
     $62 = $58 | $61;
     $63 = $59 >>> $61;
     $64 = (($62) + ($63))|0;
     $65 = $64 << 1;
     $66 = (57168 + ($65<<2)|0);
     $$sum4 = (($65) + 2)|0;
     $67 = (57168 + ($$sum4<<2)|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = ((($68)) + 8|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = ($66|0)==($70|0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[57128>>2] = $74;
       $88 = $34;
      } else {
       $75 = HEAP32[(57144)>>2]|0;
       $76 = ($70>>>0)<($75>>>0);
       if ($76) {
        _abort();
        // unreachable;
       }
       $77 = ((($70)) + 12|0);
       $78 = HEAP32[$77>>2]|0;
       $79 = ($78|0)==($68|0);
       if ($79) {
        HEAP32[$77>>2] = $66;
        HEAP32[$67>>2] = $70;
        $$pre = HEAP32[(57136)>>2]|0;
        $88 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $80 = $64 << 3;
     $81 = (($80) - ($4))|0;
     $82 = $4 | 3;
     $83 = ((($68)) + 4|0);
     HEAP32[$83>>2] = $82;
     $84 = (($68) + ($4)|0);
     $85 = $81 | 1;
     $$sum56 = $4 | 4;
     $86 = (($68) + ($$sum56)|0);
     HEAP32[$86>>2] = $85;
     $87 = (($68) + ($80)|0);
     HEAP32[$87>>2] = $81;
     $89 = ($88|0)==(0);
     if (!($89)) {
      $90 = HEAP32[(57148)>>2]|0;
      $91 = $88 >>> 3;
      $92 = $91 << 1;
      $93 = (57168 + ($92<<2)|0);
      $94 = HEAP32[57128>>2]|0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96|0)==(0);
      if ($97) {
       $98 = $94 | $95;
       HEAP32[57128>>2] = $98;
       $$pre105 = (($92) + 2)|0;
       $$pre106 = (57168 + ($$pre105<<2)|0);
       $$pre$phiZ2D = $$pre106;$F4$0 = $93;
      } else {
       $$sum9 = (($92) + 2)|0;
       $99 = (57168 + ($$sum9<<2)|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = HEAP32[(57144)>>2]|0;
       $102 = ($100>>>0)<($101>>>0);
       if ($102) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $99;$F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $90;
      $103 = ((($F4$0)) + 12|0);
      HEAP32[$103>>2] = $90;
      $104 = ((($90)) + 8|0);
      HEAP32[$104>>2] = $F4$0;
      $105 = ((($90)) + 12|0);
      HEAP32[$105>>2] = $93;
     }
     HEAP32[(57136)>>2] = $81;
     HEAP32[(57148)>>2] = $84;
     $mem$0 = $69;
     return ($mem$0|0);
    }
    $106 = HEAP32[(57132)>>2]|0;
    $107 = ($106|0)==(0);
    if ($107) {
     $nb$0 = $4;
    } else {
     $108 = (0 - ($106))|0;
     $109 = $106 & $108;
     $110 = (($109) + -1)|0;
     $111 = $110 >>> 12;
     $112 = $111 & 16;
     $113 = $110 >>> $112;
     $114 = $113 >>> 5;
     $115 = $114 & 8;
     $116 = $115 | $112;
     $117 = $113 >>> $115;
     $118 = $117 >>> 2;
     $119 = $118 & 4;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = $121 >>> 1;
     $123 = $122 & 2;
     $124 = $120 | $123;
     $125 = $121 >>> $123;
     $126 = $125 >>> 1;
     $127 = $126 & 1;
     $128 = $124 | $127;
     $129 = $125 >>> $127;
     $130 = (($128) + ($129))|0;
     $131 = (57432 + ($130<<2)|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = ((($132)) + 4|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = $134 & -8;
     $136 = (($135) - ($4))|0;
     $rsize$0$i = $136;$t$0$i = $132;$v$0$i = $132;
     while(1) {
      $137 = ((($t$0$i)) + 16|0);
      $138 = HEAP32[$137>>2]|0;
      $139 = ($138|0)==(0|0);
      if ($139) {
       $140 = ((($t$0$i)) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if ($142) {
        $rsize$0$i$lcssa = $rsize$0$i;$v$0$i$lcssa = $v$0$i;
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = ((($144)) + 4|0);
      $145 = HEAP32[$143>>2]|0;
      $146 = $145 & -8;
      $147 = (($146) - ($4))|0;
      $148 = ($147>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $144;$v$0$i = $$v$0$i;
     }
     $149 = HEAP32[(57144)>>2]|0;
     $150 = ($v$0$i$lcssa>>>0)<($149>>>0);
     if ($150) {
      _abort();
      // unreachable;
     }
     $151 = (($v$0$i$lcssa) + ($4)|0);
     $152 = ($v$0$i$lcssa>>>0)<($151>>>0);
     if (!($152)) {
      _abort();
      // unreachable;
     }
     $153 = ((($v$0$i$lcssa)) + 24|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = ((($v$0$i$lcssa)) + 12|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ($156|0)==($v$0$i$lcssa|0);
     do {
      if ($157) {
       $167 = ((($v$0$i$lcssa)) + 20|0);
       $168 = HEAP32[$167>>2]|0;
       $169 = ($168|0)==(0|0);
       if ($169) {
        $170 = ((($v$0$i$lcssa)) + 16|0);
        $171 = HEAP32[$170>>2]|0;
        $172 = ($171|0)==(0|0);
        if ($172) {
         $R$1$i = 0;
         break;
        } else {
         $R$0$i = $171;$RP$0$i = $170;
        }
       } else {
        $R$0$i = $168;$RP$0$i = $167;
       }
       while(1) {
        $173 = ((($R$0$i)) + 20|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($174|0)==(0|0);
        if (!($175)) {
         $R$0$i = $174;$RP$0$i = $173;
         continue;
        }
        $176 = ((($R$0$i)) + 16|0);
        $177 = HEAP32[$176>>2]|0;
        $178 = ($177|0)==(0|0);
        if ($178) {
         $R$0$i$lcssa = $R$0$i;$RP$0$i$lcssa = $RP$0$i;
         break;
        } else {
         $R$0$i = $177;$RP$0$i = $176;
        }
       }
       $179 = ($RP$0$i$lcssa>>>0)<($149>>>0);
       if ($179) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$0$i$lcssa>>2] = 0;
        $R$1$i = $R$0$i$lcssa;
        break;
       }
      } else {
       $158 = ((($v$0$i$lcssa)) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ($159>>>0)<($149>>>0);
       if ($160) {
        _abort();
        // unreachable;
       }
       $161 = ((($159)) + 12|0);
       $162 = HEAP32[$161>>2]|0;
       $163 = ($162|0)==($v$0$i$lcssa|0);
       if (!($163)) {
        _abort();
        // unreachable;
       }
       $164 = ((($156)) + 8|0);
       $165 = HEAP32[$164>>2]|0;
       $166 = ($165|0)==($v$0$i$lcssa|0);
       if ($166) {
        HEAP32[$161>>2] = $156;
        HEAP32[$164>>2] = $159;
        $R$1$i = $156;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $180 = ($154|0)==(0|0);
     do {
      if (!($180)) {
       $181 = ((($v$0$i$lcssa)) + 28|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = (57432 + ($182<<2)|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($v$0$i$lcssa|0)==($184|0);
       if ($185) {
        HEAP32[$183>>2] = $R$1$i;
        $cond$i = ($R$1$i|0)==(0|0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[(57132)>>2]|0;
         $189 = $188 & $187;
         HEAP32[(57132)>>2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[(57144)>>2]|0;
        $191 = ($154>>>0)<($190>>>0);
        if ($191) {
         _abort();
         // unreachable;
        }
        $192 = ((($154)) + 16|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ($193|0)==($v$0$i$lcssa|0);
        if ($194) {
         HEAP32[$192>>2] = $R$1$i;
        } else {
         $195 = ((($154)) + 20|0);
         HEAP32[$195>>2] = $R$1$i;
        }
        $196 = ($R$1$i|0)==(0|0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[(57144)>>2]|0;
       $198 = ($R$1$i>>>0)<($197>>>0);
       if ($198) {
        _abort();
        // unreachable;
       }
       $199 = ((($R$1$i)) + 24|0);
       HEAP32[$199>>2] = $154;
       $200 = ((($v$0$i$lcssa)) + 16|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = ($201|0)==(0|0);
       do {
        if (!($202)) {
         $203 = ($201>>>0)<($197>>>0);
         if ($203) {
          _abort();
          // unreachable;
         } else {
          $204 = ((($R$1$i)) + 16|0);
          HEAP32[$204>>2] = $201;
          $205 = ((($201)) + 24|0);
          HEAP32[$205>>2] = $R$1$i;
          break;
         }
        }
       } while(0);
       $206 = ((($v$0$i$lcssa)) + 20|0);
       $207 = HEAP32[$206>>2]|0;
       $208 = ($207|0)==(0|0);
       if (!($208)) {
        $209 = HEAP32[(57144)>>2]|0;
        $210 = ($207>>>0)<($209>>>0);
        if ($210) {
         _abort();
         // unreachable;
        } else {
         $211 = ((($R$1$i)) + 20|0);
         HEAP32[$211>>2] = $207;
         $212 = ((($207)) + 24|0);
         HEAP32[$212>>2] = $R$1$i;
         break;
        }
       }
      }
     } while(0);
     $213 = ($rsize$0$i$lcssa>>>0)<(16);
     if ($213) {
      $214 = (($rsize$0$i$lcssa) + ($4))|0;
      $215 = $214 | 3;
      $216 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$216>>2] = $215;
      $$sum4$i = (($214) + 4)|0;
      $217 = (($v$0$i$lcssa) + ($$sum4$i)|0);
      $218 = HEAP32[$217>>2]|0;
      $219 = $218 | 1;
      HEAP32[$217>>2] = $219;
     } else {
      $220 = $4 | 3;
      $221 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$221>>2] = $220;
      $222 = $rsize$0$i$lcssa | 1;
      $$sum$i35 = $4 | 4;
      $223 = (($v$0$i$lcssa) + ($$sum$i35)|0);
      HEAP32[$223>>2] = $222;
      $$sum1$i = (($rsize$0$i$lcssa) + ($4))|0;
      $224 = (($v$0$i$lcssa) + ($$sum1$i)|0);
      HEAP32[$224>>2] = $rsize$0$i$lcssa;
      $225 = HEAP32[(57136)>>2]|0;
      $226 = ($225|0)==(0);
      if (!($226)) {
       $227 = HEAP32[(57148)>>2]|0;
       $228 = $225 >>> 3;
       $229 = $228 << 1;
       $230 = (57168 + ($229<<2)|0);
       $231 = HEAP32[57128>>2]|0;
       $232 = 1 << $228;
       $233 = $231 & $232;
       $234 = ($233|0)==(0);
       if ($234) {
        $235 = $231 | $232;
        HEAP32[57128>>2] = $235;
        $$pre$i = (($229) + 2)|0;
        $$pre8$i = (57168 + ($$pre$i<<2)|0);
        $$pre$phi$iZ2D = $$pre8$i;$F1$0$i = $230;
       } else {
        $$sum3$i = (($229) + 2)|0;
        $236 = (57168 + ($$sum3$i<<2)|0);
        $237 = HEAP32[$236>>2]|0;
        $238 = HEAP32[(57144)>>2]|0;
        $239 = ($237>>>0)<($238>>>0);
        if ($239) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $236;$F1$0$i = $237;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $227;
       $240 = ((($F1$0$i)) + 12|0);
       HEAP32[$240>>2] = $227;
       $241 = ((($227)) + 8|0);
       HEAP32[$241>>2] = $F1$0$i;
       $242 = ((($227)) + 12|0);
       HEAP32[$242>>2] = $230;
      }
      HEAP32[(57136)>>2] = $rsize$0$i$lcssa;
      HEAP32[(57148)>>2] = $151;
     }
     $243 = ((($v$0$i$lcssa)) + 8|0);
     $mem$0 = $243;
     return ($mem$0|0);
    }
   } else {
    $nb$0 = $4;
   }
  } else {
   $244 = ($bytes>>>0)>(4294967231);
   if ($244) {
    $nb$0 = -1;
   } else {
    $245 = (($bytes) + 11)|0;
    $246 = $245 & -8;
    $247 = HEAP32[(57132)>>2]|0;
    $248 = ($247|0)==(0);
    if ($248) {
     $nb$0 = $246;
    } else {
     $249 = (0 - ($246))|0;
     $250 = $245 >>> 8;
     $251 = ($250|0)==(0);
     if ($251) {
      $idx$0$i = 0;
     } else {
      $252 = ($246>>>0)>(16777215);
      if ($252) {
       $idx$0$i = 31;
      } else {
       $253 = (($250) + 1048320)|0;
       $254 = $253 >>> 16;
       $255 = $254 & 8;
       $256 = $250 << $255;
       $257 = (($256) + 520192)|0;
       $258 = $257 >>> 16;
       $259 = $258 & 4;
       $260 = $259 | $255;
       $261 = $256 << $259;
       $262 = (($261) + 245760)|0;
       $263 = $262 >>> 16;
       $264 = $263 & 2;
       $265 = $260 | $264;
       $266 = (14 - ($265))|0;
       $267 = $261 << $264;
       $268 = $267 >>> 15;
       $269 = (($266) + ($268))|0;
       $270 = $269 << 1;
       $271 = (($269) + 7)|0;
       $272 = $246 >>> $271;
       $273 = $272 & 1;
       $274 = $273 | $270;
       $idx$0$i = $274;
      }
     }
     $275 = (57432 + ($idx$0$i<<2)|0);
     $276 = HEAP32[$275>>2]|0;
     $277 = ($276|0)==(0|0);
     L123: do {
      if ($277) {
       $rsize$2$i = $249;$t$1$i = 0;$v$2$i = 0;
       label = 86;
      } else {
       $278 = ($idx$0$i|0)==(31);
       $279 = $idx$0$i >>> 1;
       $280 = (25 - ($279))|0;
       $281 = $278 ? 0 : $280;
       $282 = $246 << $281;
       $rsize$0$i15 = $249;$rst$0$i = 0;$sizebits$0$i = $282;$t$0$i14 = $276;$v$0$i16 = 0;
       while(1) {
        $283 = ((($t$0$i14)) + 4|0);
        $284 = HEAP32[$283>>2]|0;
        $285 = $284 & -8;
        $286 = (($285) - ($246))|0;
        $287 = ($286>>>0)<($rsize$0$i15>>>0);
        if ($287) {
         $288 = ($285|0)==($246|0);
         if ($288) {
          $rsize$331$i = $286;$t$230$i = $t$0$i14;$v$332$i = $t$0$i14;
          label = 90;
          break L123;
         } else {
          $rsize$1$i = $286;$v$1$i = $t$0$i14;
         }
        } else {
         $rsize$1$i = $rsize$0$i15;$v$1$i = $v$0$i16;
        }
        $289 = ((($t$0$i14)) + 20|0);
        $290 = HEAP32[$289>>2]|0;
        $291 = $sizebits$0$i >>> 31;
        $292 = (((($t$0$i14)) + 16|0) + ($291<<2)|0);
        $293 = HEAP32[$292>>2]|0;
        $294 = ($290|0)==(0|0);
        $295 = ($290|0)==($293|0);
        $or$cond19$i = $294 | $295;
        $rst$1$i = $or$cond19$i ? $rst$0$i : $290;
        $296 = ($293|0)==(0|0);
        $297 = $sizebits$0$i << 1;
        if ($296) {
         $rsize$2$i = $rsize$1$i;$t$1$i = $rst$1$i;$v$2$i = $v$1$i;
         label = 86;
         break;
        } else {
         $rsize$0$i15 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $297;$t$0$i14 = $293;$v$0$i16 = $v$1$i;
        }
       }
      }
     } while(0);
     if ((label|0) == 86) {
      $298 = ($t$1$i|0)==(0|0);
      $299 = ($v$2$i|0)==(0|0);
      $or$cond$i = $298 & $299;
      if ($or$cond$i) {
       $300 = 2 << $idx$0$i;
       $301 = (0 - ($300))|0;
       $302 = $300 | $301;
       $303 = $247 & $302;
       $304 = ($303|0)==(0);
       if ($304) {
        $nb$0 = $246;
        break;
       }
       $305 = (0 - ($303))|0;
       $306 = $303 & $305;
       $307 = (($306) + -1)|0;
       $308 = $307 >>> 12;
       $309 = $308 & 16;
       $310 = $307 >>> $309;
       $311 = $310 >>> 5;
       $312 = $311 & 8;
       $313 = $312 | $309;
       $314 = $310 >>> $312;
       $315 = $314 >>> 2;
       $316 = $315 & 4;
       $317 = $313 | $316;
       $318 = $314 >>> $316;
       $319 = $318 >>> 1;
       $320 = $319 & 2;
       $321 = $317 | $320;
       $322 = $318 >>> $320;
       $323 = $322 >>> 1;
       $324 = $323 & 1;
       $325 = $321 | $324;
       $326 = $322 >>> $324;
       $327 = (($325) + ($326))|0;
       $328 = (57432 + ($327<<2)|0);
       $329 = HEAP32[$328>>2]|0;
       $t$2$ph$i = $329;$v$3$ph$i = 0;
      } else {
       $t$2$ph$i = $t$1$i;$v$3$ph$i = $v$2$i;
      }
      $330 = ($t$2$ph$i|0)==(0|0);
      if ($330) {
       $rsize$3$lcssa$i = $rsize$2$i;$v$3$lcssa$i = $v$3$ph$i;
      } else {
       $rsize$331$i = $rsize$2$i;$t$230$i = $t$2$ph$i;$v$332$i = $v$3$ph$i;
       label = 90;
      }
     }
     if ((label|0) == 90) {
      while(1) {
       label = 0;
       $331 = ((($t$230$i)) + 4|0);
       $332 = HEAP32[$331>>2]|0;
       $333 = $332 & -8;
       $334 = (($333) - ($246))|0;
       $335 = ($334>>>0)<($rsize$331$i>>>0);
       $$rsize$3$i = $335 ? $334 : $rsize$331$i;
       $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
       $336 = ((($t$230$i)) + 16|0);
       $337 = HEAP32[$336>>2]|0;
       $338 = ($337|0)==(0|0);
       if (!($338)) {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $337;$v$332$i = $t$2$v$3$i;
        label = 90;
        continue;
       }
       $339 = ((($t$230$i)) + 20|0);
       $340 = HEAP32[$339>>2]|0;
       $341 = ($340|0)==(0|0);
       if ($341) {
        $rsize$3$lcssa$i = $$rsize$3$i;$v$3$lcssa$i = $t$2$v$3$i;
        break;
       } else {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $340;$v$332$i = $t$2$v$3$i;
        label = 90;
       }
      }
     }
     $342 = ($v$3$lcssa$i|0)==(0|0);
     if ($342) {
      $nb$0 = $246;
     } else {
      $343 = HEAP32[(57136)>>2]|0;
      $344 = (($343) - ($246))|0;
      $345 = ($rsize$3$lcssa$i>>>0)<($344>>>0);
      if ($345) {
       $346 = HEAP32[(57144)>>2]|0;
       $347 = ($v$3$lcssa$i>>>0)<($346>>>0);
       if ($347) {
        _abort();
        // unreachable;
       }
       $348 = (($v$3$lcssa$i) + ($246)|0);
       $349 = ($v$3$lcssa$i>>>0)<($348>>>0);
       if (!($349)) {
        _abort();
        // unreachable;
       }
       $350 = ((($v$3$lcssa$i)) + 24|0);
       $351 = HEAP32[$350>>2]|0;
       $352 = ((($v$3$lcssa$i)) + 12|0);
       $353 = HEAP32[$352>>2]|0;
       $354 = ($353|0)==($v$3$lcssa$i|0);
       do {
        if ($354) {
         $364 = ((($v$3$lcssa$i)) + 20|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==(0|0);
         if ($366) {
          $367 = ((($v$3$lcssa$i)) + 16|0);
          $368 = HEAP32[$367>>2]|0;
          $369 = ($368|0)==(0|0);
          if ($369) {
           $R$1$i20 = 0;
           break;
          } else {
           $R$0$i18 = $368;$RP$0$i17 = $367;
          }
         } else {
          $R$0$i18 = $365;$RP$0$i17 = $364;
         }
         while(1) {
          $370 = ((($R$0$i18)) + 20|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if (!($372)) {
           $R$0$i18 = $371;$RP$0$i17 = $370;
           continue;
          }
          $373 = ((($R$0$i18)) + 16|0);
          $374 = HEAP32[$373>>2]|0;
          $375 = ($374|0)==(0|0);
          if ($375) {
           $R$0$i18$lcssa = $R$0$i18;$RP$0$i17$lcssa = $RP$0$i17;
           break;
          } else {
           $R$0$i18 = $374;$RP$0$i17 = $373;
          }
         }
         $376 = ($RP$0$i17$lcssa>>>0)<($346>>>0);
         if ($376) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$0$i17$lcssa>>2] = 0;
          $R$1$i20 = $R$0$i18$lcssa;
          break;
         }
        } else {
         $355 = ((($v$3$lcssa$i)) + 8|0);
         $356 = HEAP32[$355>>2]|0;
         $357 = ($356>>>0)<($346>>>0);
         if ($357) {
          _abort();
          // unreachable;
         }
         $358 = ((($356)) + 12|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359|0)==($v$3$lcssa$i|0);
         if (!($360)) {
          _abort();
          // unreachable;
         }
         $361 = ((($353)) + 8|0);
         $362 = HEAP32[$361>>2]|0;
         $363 = ($362|0)==($v$3$lcssa$i|0);
         if ($363) {
          HEAP32[$358>>2] = $353;
          HEAP32[$361>>2] = $356;
          $R$1$i20 = $353;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $377 = ($351|0)==(0|0);
       do {
        if (!($377)) {
         $378 = ((($v$3$lcssa$i)) + 28|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = (57432 + ($379<<2)|0);
         $381 = HEAP32[$380>>2]|0;
         $382 = ($v$3$lcssa$i|0)==($381|0);
         if ($382) {
          HEAP32[$380>>2] = $R$1$i20;
          $cond$i21 = ($R$1$i20|0)==(0|0);
          if ($cond$i21) {
           $383 = 1 << $379;
           $384 = $383 ^ -1;
           $385 = HEAP32[(57132)>>2]|0;
           $386 = $385 & $384;
           HEAP32[(57132)>>2] = $386;
           break;
          }
         } else {
          $387 = HEAP32[(57144)>>2]|0;
          $388 = ($351>>>0)<($387>>>0);
          if ($388) {
           _abort();
           // unreachable;
          }
          $389 = ((($351)) + 16|0);
          $390 = HEAP32[$389>>2]|0;
          $391 = ($390|0)==($v$3$lcssa$i|0);
          if ($391) {
           HEAP32[$389>>2] = $R$1$i20;
          } else {
           $392 = ((($351)) + 20|0);
           HEAP32[$392>>2] = $R$1$i20;
          }
          $393 = ($R$1$i20|0)==(0|0);
          if ($393) {
           break;
          }
         }
         $394 = HEAP32[(57144)>>2]|0;
         $395 = ($R$1$i20>>>0)<($394>>>0);
         if ($395) {
          _abort();
          // unreachable;
         }
         $396 = ((($R$1$i20)) + 24|0);
         HEAP32[$396>>2] = $351;
         $397 = ((($v$3$lcssa$i)) + 16|0);
         $398 = HEAP32[$397>>2]|0;
         $399 = ($398|0)==(0|0);
         do {
          if (!($399)) {
           $400 = ($398>>>0)<($394>>>0);
           if ($400) {
            _abort();
            // unreachable;
           } else {
            $401 = ((($R$1$i20)) + 16|0);
            HEAP32[$401>>2] = $398;
            $402 = ((($398)) + 24|0);
            HEAP32[$402>>2] = $R$1$i20;
            break;
           }
          }
         } while(0);
         $403 = ((($v$3$lcssa$i)) + 20|0);
         $404 = HEAP32[$403>>2]|0;
         $405 = ($404|0)==(0|0);
         if (!($405)) {
          $406 = HEAP32[(57144)>>2]|0;
          $407 = ($404>>>0)<($406>>>0);
          if ($407) {
           _abort();
           // unreachable;
          } else {
           $408 = ((($R$1$i20)) + 20|0);
           HEAP32[$408>>2] = $404;
           $409 = ((($404)) + 24|0);
           HEAP32[$409>>2] = $R$1$i20;
           break;
          }
         }
        }
       } while(0);
       $410 = ($rsize$3$lcssa$i>>>0)<(16);
       L199: do {
        if ($410) {
         $411 = (($rsize$3$lcssa$i) + ($246))|0;
         $412 = $411 | 3;
         $413 = ((($v$3$lcssa$i)) + 4|0);
         HEAP32[$413>>2] = $412;
         $$sum18$i = (($411) + 4)|0;
         $414 = (($v$3$lcssa$i) + ($$sum18$i)|0);
         $415 = HEAP32[$414>>2]|0;
         $416 = $415 | 1;
         HEAP32[$414>>2] = $416;
        } else {
         $417 = $246 | 3;
         $418 = ((($v$3$lcssa$i)) + 4|0);
         HEAP32[$418>>2] = $417;
         $419 = $rsize$3$lcssa$i | 1;
         $$sum$i2334 = $246 | 4;
         $420 = (($v$3$lcssa$i) + ($$sum$i2334)|0);
         HEAP32[$420>>2] = $419;
         $$sum1$i24 = (($rsize$3$lcssa$i) + ($246))|0;
         $421 = (($v$3$lcssa$i) + ($$sum1$i24)|0);
         HEAP32[$421>>2] = $rsize$3$lcssa$i;
         $422 = $rsize$3$lcssa$i >>> 3;
         $423 = ($rsize$3$lcssa$i>>>0)<(256);
         if ($423) {
          $424 = $422 << 1;
          $425 = (57168 + ($424<<2)|0);
          $426 = HEAP32[57128>>2]|0;
          $427 = 1 << $422;
          $428 = $426 & $427;
          $429 = ($428|0)==(0);
          if ($429) {
           $430 = $426 | $427;
           HEAP32[57128>>2] = $430;
           $$pre$i25 = (($424) + 2)|0;
           $$pre43$i = (57168 + ($$pre$i25<<2)|0);
           $$pre$phi$i26Z2D = $$pre43$i;$F5$0$i = $425;
          } else {
           $$sum17$i = (($424) + 2)|0;
           $431 = (57168 + ($$sum17$i<<2)|0);
           $432 = HEAP32[$431>>2]|0;
           $433 = HEAP32[(57144)>>2]|0;
           $434 = ($432>>>0)<($433>>>0);
           if ($434) {
            _abort();
            // unreachable;
           } else {
            $$pre$phi$i26Z2D = $431;$F5$0$i = $432;
           }
          }
          HEAP32[$$pre$phi$i26Z2D>>2] = $348;
          $435 = ((($F5$0$i)) + 12|0);
          HEAP32[$435>>2] = $348;
          $$sum15$i = (($246) + 8)|0;
          $436 = (($v$3$lcssa$i) + ($$sum15$i)|0);
          HEAP32[$436>>2] = $F5$0$i;
          $$sum16$i = (($246) + 12)|0;
          $437 = (($v$3$lcssa$i) + ($$sum16$i)|0);
          HEAP32[$437>>2] = $425;
          break;
         }
         $438 = $rsize$3$lcssa$i >>> 8;
         $439 = ($438|0)==(0);
         if ($439) {
          $I7$0$i = 0;
         } else {
          $440 = ($rsize$3$lcssa$i>>>0)>(16777215);
          if ($440) {
           $I7$0$i = 31;
          } else {
           $441 = (($438) + 1048320)|0;
           $442 = $441 >>> 16;
           $443 = $442 & 8;
           $444 = $438 << $443;
           $445 = (($444) + 520192)|0;
           $446 = $445 >>> 16;
           $447 = $446 & 4;
           $448 = $447 | $443;
           $449 = $444 << $447;
           $450 = (($449) + 245760)|0;
           $451 = $450 >>> 16;
           $452 = $451 & 2;
           $453 = $448 | $452;
           $454 = (14 - ($453))|0;
           $455 = $449 << $452;
           $456 = $455 >>> 15;
           $457 = (($454) + ($456))|0;
           $458 = $457 << 1;
           $459 = (($457) + 7)|0;
           $460 = $rsize$3$lcssa$i >>> $459;
           $461 = $460 & 1;
           $462 = $461 | $458;
           $I7$0$i = $462;
          }
         }
         $463 = (57432 + ($I7$0$i<<2)|0);
         $$sum2$i = (($246) + 28)|0;
         $464 = (($v$3$lcssa$i) + ($$sum2$i)|0);
         HEAP32[$464>>2] = $I7$0$i;
         $$sum3$i27 = (($246) + 16)|0;
         $465 = (($v$3$lcssa$i) + ($$sum3$i27)|0);
         $$sum4$i28 = (($246) + 20)|0;
         $466 = (($v$3$lcssa$i) + ($$sum4$i28)|0);
         HEAP32[$466>>2] = 0;
         HEAP32[$465>>2] = 0;
         $467 = HEAP32[(57132)>>2]|0;
         $468 = 1 << $I7$0$i;
         $469 = $467 & $468;
         $470 = ($469|0)==(0);
         if ($470) {
          $471 = $467 | $468;
          HEAP32[(57132)>>2] = $471;
          HEAP32[$463>>2] = $348;
          $$sum5$i = (($246) + 24)|0;
          $472 = (($v$3$lcssa$i) + ($$sum5$i)|0);
          HEAP32[$472>>2] = $463;
          $$sum6$i = (($246) + 12)|0;
          $473 = (($v$3$lcssa$i) + ($$sum6$i)|0);
          HEAP32[$473>>2] = $348;
          $$sum7$i = (($246) + 8)|0;
          $474 = (($v$3$lcssa$i) + ($$sum7$i)|0);
          HEAP32[$474>>2] = $348;
          break;
         }
         $475 = HEAP32[$463>>2]|0;
         $476 = ((($475)) + 4|0);
         $477 = HEAP32[$476>>2]|0;
         $478 = $477 & -8;
         $479 = ($478|0)==($rsize$3$lcssa$i|0);
         L217: do {
          if ($479) {
           $T$0$lcssa$i = $475;
          } else {
           $480 = ($I7$0$i|0)==(31);
           $481 = $I7$0$i >>> 1;
           $482 = (25 - ($481))|0;
           $483 = $480 ? 0 : $482;
           $484 = $rsize$3$lcssa$i << $483;
           $K12$029$i = $484;$T$028$i = $475;
           while(1) {
            $491 = $K12$029$i >>> 31;
            $492 = (((($T$028$i)) + 16|0) + ($491<<2)|0);
            $487 = HEAP32[$492>>2]|0;
            $493 = ($487|0)==(0|0);
            if ($493) {
             $$lcssa232 = $492;$T$028$i$lcssa = $T$028$i;
             break;
            }
            $485 = $K12$029$i << 1;
            $486 = ((($487)) + 4|0);
            $488 = HEAP32[$486>>2]|0;
            $489 = $488 & -8;
            $490 = ($489|0)==($rsize$3$lcssa$i|0);
            if ($490) {
             $T$0$lcssa$i = $487;
             break L217;
            } else {
             $K12$029$i = $485;$T$028$i = $487;
            }
           }
           $494 = HEAP32[(57144)>>2]|0;
           $495 = ($$lcssa232>>>0)<($494>>>0);
           if ($495) {
            _abort();
            // unreachable;
           } else {
            HEAP32[$$lcssa232>>2] = $348;
            $$sum11$i = (($246) + 24)|0;
            $496 = (($v$3$lcssa$i) + ($$sum11$i)|0);
            HEAP32[$496>>2] = $T$028$i$lcssa;
            $$sum12$i = (($246) + 12)|0;
            $497 = (($v$3$lcssa$i) + ($$sum12$i)|0);
            HEAP32[$497>>2] = $348;
            $$sum13$i = (($246) + 8)|0;
            $498 = (($v$3$lcssa$i) + ($$sum13$i)|0);
            HEAP32[$498>>2] = $348;
            break L199;
           }
          }
         } while(0);
         $499 = ((($T$0$lcssa$i)) + 8|0);
         $500 = HEAP32[$499>>2]|0;
         $501 = HEAP32[(57144)>>2]|0;
         $502 = ($500>>>0)>=($501>>>0);
         $not$$i = ($T$0$lcssa$i>>>0)>=($501>>>0);
         $503 = $502 & $not$$i;
         if ($503) {
          $504 = ((($500)) + 12|0);
          HEAP32[$504>>2] = $348;
          HEAP32[$499>>2] = $348;
          $$sum8$i = (($246) + 8)|0;
          $505 = (($v$3$lcssa$i) + ($$sum8$i)|0);
          HEAP32[$505>>2] = $500;
          $$sum9$i = (($246) + 12)|0;
          $506 = (($v$3$lcssa$i) + ($$sum9$i)|0);
          HEAP32[$506>>2] = $T$0$lcssa$i;
          $$sum10$i = (($246) + 24)|0;
          $507 = (($v$3$lcssa$i) + ($$sum10$i)|0);
          HEAP32[$507>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $508 = ((($v$3$lcssa$i)) + 8|0);
       $mem$0 = $508;
       return ($mem$0|0);
      } else {
       $nb$0 = $246;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[(57136)>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[(57148)>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[(57148)>>2] = $514;
   HEAP32[(57136)>>2] = $511;
   $515 = $511 | 1;
   $$sum2 = (($nb$0) + 4)|0;
   $516 = (($512) + ($$sum2)|0);
   HEAP32[$516>>2] = $515;
   $517 = (($512) + ($509)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = ((($512)) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[(57136)>>2] = 0;
   HEAP32[(57148)>>2] = 0;
   $520 = $509 | 3;
   $521 = ((($512)) + 4|0);
   HEAP32[$521>>2] = $520;
   $$sum1 = (($509) + 4)|0;
   $522 = (($512) + ($$sum1)|0);
   $523 = HEAP32[$522>>2]|0;
   $524 = $523 | 1;
   HEAP32[$522>>2] = $524;
  }
  $525 = ((($512)) + 8|0);
  $mem$0 = $525;
  return ($mem$0|0);
 }
 $526 = HEAP32[(57140)>>2]|0;
 $527 = ($526>>>0)>($nb$0>>>0);
 if ($527) {
  $528 = (($526) - ($nb$0))|0;
  HEAP32[(57140)>>2] = $528;
  $529 = HEAP32[(57152)>>2]|0;
  $530 = (($529) + ($nb$0)|0);
  HEAP32[(57152)>>2] = $530;
  $531 = $528 | 1;
  $$sum = (($nb$0) + 4)|0;
  $532 = (($529) + ($$sum)|0);
  HEAP32[$532>>2] = $531;
  $533 = $nb$0 | 3;
  $534 = ((($529)) + 4|0);
  HEAP32[$534>>2] = $533;
  $535 = ((($529)) + 8|0);
  $mem$0 = $535;
  return ($mem$0|0);
 }
 $536 = HEAP32[57600>>2]|0;
 $537 = ($536|0)==(0);
 do {
  if ($537) {
   $538 = (_sysconf(30)|0);
   $539 = (($538) + -1)|0;
   $540 = $539 & $538;
   $541 = ($540|0)==(0);
   if ($541) {
    HEAP32[(57608)>>2] = $538;
    HEAP32[(57604)>>2] = $538;
    HEAP32[(57612)>>2] = -1;
    HEAP32[(57616)>>2] = -1;
    HEAP32[(57620)>>2] = 0;
    HEAP32[(57572)>>2] = 0;
    $542 = (_time((0|0))|0);
    $543 = $542 & -16;
    $544 = $543 ^ 1431655768;
    HEAP32[57600>>2] = $544;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $545 = (($nb$0) + 48)|0;
 $546 = HEAP32[(57608)>>2]|0;
 $547 = (($nb$0) + 47)|0;
 $548 = (($546) + ($547))|0;
 $549 = (0 - ($546))|0;
 $550 = $548 & $549;
 $551 = ($550>>>0)>($nb$0>>>0);
 if (!($551)) {
  $mem$0 = 0;
  return ($mem$0|0);
 }
 $552 = HEAP32[(57568)>>2]|0;
 $553 = ($552|0)==(0);
 if (!($553)) {
  $554 = HEAP32[(57560)>>2]|0;
  $555 = (($554) + ($550))|0;
  $556 = ($555>>>0)<=($554>>>0);
  $557 = ($555>>>0)>($552>>>0);
  $or$cond1$i = $556 | $557;
  if ($or$cond1$i) {
   $mem$0 = 0;
   return ($mem$0|0);
  }
 }
 $558 = HEAP32[(57572)>>2]|0;
 $559 = $558 & 4;
 $560 = ($559|0)==(0);
 L258: do {
  if ($560) {
   $561 = HEAP32[(57152)>>2]|0;
   $562 = ($561|0)==(0|0);
   L260: do {
    if ($562) {
     label = 174;
    } else {
     $sp$0$i$i = (57576);
     while(1) {
      $563 = HEAP32[$sp$0$i$i>>2]|0;
      $564 = ($563>>>0)>($561>>>0);
      if (!($564)) {
       $565 = ((($sp$0$i$i)) + 4|0);
       $566 = HEAP32[$565>>2]|0;
       $567 = (($563) + ($566)|0);
       $568 = ($567>>>0)>($561>>>0);
       if ($568) {
        $$lcssa228 = $sp$0$i$i;$$lcssa230 = $565;
        break;
       }
      }
      $569 = ((($sp$0$i$i)) + 8|0);
      $570 = HEAP32[$569>>2]|0;
      $571 = ($570|0)==(0|0);
      if ($571) {
       label = 174;
       break L260;
      } else {
       $sp$0$i$i = $570;
      }
     }
     $594 = HEAP32[(57140)>>2]|0;
     $595 = (($548) - ($594))|0;
     $596 = $595 & $549;
     $597 = ($596>>>0)<(2147483647);
     if ($597) {
      $598 = (_sbrk(($596|0))|0);
      $599 = HEAP32[$$lcssa228>>2]|0;
      $600 = HEAP32[$$lcssa230>>2]|0;
      $601 = (($599) + ($600)|0);
      $602 = ($598|0)==($601|0);
      $$3$i = $602 ? $596 : 0;
      if ($602) {
       $603 = ($598|0)==((-1)|0);
       if ($603) {
        $tsize$0323944$i = $$3$i;
       } else {
        $tbase$255$i = $598;$tsize$254$i = $$3$i;
        label = 194;
        break L258;
       }
      } else {
       $br$0$ph$i = $598;$ssize$1$ph$i = $596;$tsize$0$ph$i = $$3$i;
       label = 184;
      }
     } else {
      $tsize$0323944$i = 0;
     }
    }
   } while(0);
   do {
    if ((label|0) == 174) {
     $572 = (_sbrk(0)|0);
     $573 = ($572|0)==((-1)|0);
     if ($573) {
      $tsize$0323944$i = 0;
     } else {
      $574 = $572;
      $575 = HEAP32[(57604)>>2]|0;
      $576 = (($575) + -1)|0;
      $577 = $576 & $574;
      $578 = ($577|0)==(0);
      if ($578) {
       $ssize$0$i = $550;
      } else {
       $579 = (($576) + ($574))|0;
       $580 = (0 - ($575))|0;
       $581 = $579 & $580;
       $582 = (($550) - ($574))|0;
       $583 = (($582) + ($581))|0;
       $ssize$0$i = $583;
      }
      $584 = HEAP32[(57560)>>2]|0;
      $585 = (($584) + ($ssize$0$i))|0;
      $586 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $587 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i30 = $586 & $587;
      if ($or$cond$i30) {
       $588 = HEAP32[(57568)>>2]|0;
       $589 = ($588|0)==(0);
       if (!($589)) {
        $590 = ($585>>>0)<=($584>>>0);
        $591 = ($585>>>0)>($588>>>0);
        $or$cond2$i = $590 | $591;
        if ($or$cond2$i) {
         $tsize$0323944$i = 0;
         break;
        }
       }
       $592 = (_sbrk(($ssize$0$i|0))|0);
       $593 = ($592|0)==($572|0);
       $ssize$0$$i = $593 ? $ssize$0$i : 0;
       if ($593) {
        $tbase$255$i = $572;$tsize$254$i = $ssize$0$$i;
        label = 194;
        break L258;
       } else {
        $br$0$ph$i = $592;$ssize$1$ph$i = $ssize$0$i;$tsize$0$ph$i = $ssize$0$$i;
        label = 184;
       }
      } else {
       $tsize$0323944$i = 0;
      }
     }
    }
   } while(0);
   L280: do {
    if ((label|0) == 184) {
     $604 = (0 - ($ssize$1$ph$i))|0;
     $605 = ($br$0$ph$i|0)!=((-1)|0);
     $606 = ($ssize$1$ph$i>>>0)<(2147483647);
     $or$cond5$i = $606 & $605;
     $607 = ($545>>>0)>($ssize$1$ph$i>>>0);
     $or$cond6$i = $607 & $or$cond5$i;
     do {
      if ($or$cond6$i) {
       $608 = HEAP32[(57608)>>2]|0;
       $609 = (($547) - ($ssize$1$ph$i))|0;
       $610 = (($609) + ($608))|0;
       $611 = (0 - ($608))|0;
       $612 = $610 & $611;
       $613 = ($612>>>0)<(2147483647);
       if ($613) {
        $614 = (_sbrk(($612|0))|0);
        $615 = ($614|0)==((-1)|0);
        if ($615) {
         (_sbrk(($604|0))|0);
         $tsize$0323944$i = $tsize$0$ph$i;
         break L280;
        } else {
         $616 = (($612) + ($ssize$1$ph$i))|0;
         $ssize$2$i = $616;
         break;
        }
       } else {
        $ssize$2$i = $ssize$1$ph$i;
       }
      } else {
       $ssize$2$i = $ssize$1$ph$i;
      }
     } while(0);
     $617 = ($br$0$ph$i|0)==((-1)|0);
     if ($617) {
      $tsize$0323944$i = $tsize$0$ph$i;
     } else {
      $tbase$255$i = $br$0$ph$i;$tsize$254$i = $ssize$2$i;
      label = 194;
      break L258;
     }
    }
   } while(0);
   $618 = HEAP32[(57572)>>2]|0;
   $619 = $618 | 4;
   HEAP32[(57572)>>2] = $619;
   $tsize$1$i = $tsize$0323944$i;
   label = 191;
  } else {
   $tsize$1$i = 0;
   label = 191;
  }
 } while(0);
 if ((label|0) == 191) {
  $620 = ($550>>>0)<(2147483647);
  if ($620) {
   $621 = (_sbrk(($550|0))|0);
   $622 = (_sbrk(0)|0);
   $623 = ($621|0)!=((-1)|0);
   $624 = ($622|0)!=((-1)|0);
   $or$cond3$i = $623 & $624;
   $625 = ($621>>>0)<($622>>>0);
   $or$cond8$i = $625 & $or$cond3$i;
   if ($or$cond8$i) {
    $626 = $622;
    $627 = $621;
    $628 = (($626) - ($627))|0;
    $629 = (($nb$0) + 40)|0;
    $630 = ($628>>>0)>($629>>>0);
    $$tsize$1$i = $630 ? $628 : $tsize$1$i;
    if ($630) {
     $tbase$255$i = $621;$tsize$254$i = $$tsize$1$i;
     label = 194;
    }
   }
  }
 }
 if ((label|0) == 194) {
  $631 = HEAP32[(57560)>>2]|0;
  $632 = (($631) + ($tsize$254$i))|0;
  HEAP32[(57560)>>2] = $632;
  $633 = HEAP32[(57564)>>2]|0;
  $634 = ($632>>>0)>($633>>>0);
  if ($634) {
   HEAP32[(57564)>>2] = $632;
  }
  $635 = HEAP32[(57152)>>2]|0;
  $636 = ($635|0)==(0|0);
  L299: do {
   if ($636) {
    $637 = HEAP32[(57144)>>2]|0;
    $638 = ($637|0)==(0|0);
    $639 = ($tbase$255$i>>>0)<($637>>>0);
    $or$cond9$i = $638 | $639;
    if ($or$cond9$i) {
     HEAP32[(57144)>>2] = $tbase$255$i;
    }
    HEAP32[(57576)>>2] = $tbase$255$i;
    HEAP32[(57580)>>2] = $tsize$254$i;
    HEAP32[(57588)>>2] = 0;
    $640 = HEAP32[57600>>2]|0;
    HEAP32[(57164)>>2] = $640;
    HEAP32[(57160)>>2] = -1;
    $i$02$i$i = 0;
    while(1) {
     $641 = $i$02$i$i << 1;
     $642 = (57168 + ($641<<2)|0);
     $$sum$i$i = (($641) + 3)|0;
     $643 = (57168 + ($$sum$i$i<<2)|0);
     HEAP32[$643>>2] = $642;
     $$sum1$i$i = (($641) + 2)|0;
     $644 = (57168 + ($$sum1$i$i<<2)|0);
     HEAP32[$644>>2] = $642;
     $645 = (($i$02$i$i) + 1)|0;
     $exitcond$i$i = ($645|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $645;
     }
    }
    $646 = (($tsize$254$i) + -40)|0;
    $647 = ((($tbase$255$i)) + 8|0);
    $648 = $647;
    $649 = $648 & 7;
    $650 = ($649|0)==(0);
    $651 = (0 - ($648))|0;
    $652 = $651 & 7;
    $653 = $650 ? 0 : $652;
    $654 = (($tbase$255$i) + ($653)|0);
    $655 = (($646) - ($653))|0;
    HEAP32[(57152)>>2] = $654;
    HEAP32[(57140)>>2] = $655;
    $656 = $655 | 1;
    $$sum$i13$i = (($653) + 4)|0;
    $657 = (($tbase$255$i) + ($$sum$i13$i)|0);
    HEAP32[$657>>2] = $656;
    $$sum2$i$i = (($tsize$254$i) + -36)|0;
    $658 = (($tbase$255$i) + ($$sum2$i$i)|0);
    HEAP32[$658>>2] = 40;
    $659 = HEAP32[(57616)>>2]|0;
    HEAP32[(57156)>>2] = $659;
   } else {
    $sp$084$i = (57576);
    while(1) {
     $660 = HEAP32[$sp$084$i>>2]|0;
     $661 = ((($sp$084$i)) + 4|0);
     $662 = HEAP32[$661>>2]|0;
     $663 = (($660) + ($662)|0);
     $664 = ($tbase$255$i|0)==($663|0);
     if ($664) {
      $$lcssa222 = $660;$$lcssa224 = $661;$$lcssa226 = $662;$sp$084$i$lcssa = $sp$084$i;
      label = 204;
      break;
     }
     $665 = ((($sp$084$i)) + 8|0);
     $666 = HEAP32[$665>>2]|0;
     $667 = ($666|0)==(0|0);
     if ($667) {
      break;
     } else {
      $sp$084$i = $666;
     }
    }
    if ((label|0) == 204) {
     $668 = ((($sp$084$i$lcssa)) + 12|0);
     $669 = HEAP32[$668>>2]|0;
     $670 = $669 & 8;
     $671 = ($670|0)==(0);
     if ($671) {
      $672 = ($635>>>0)>=($$lcssa222>>>0);
      $673 = ($635>>>0)<($tbase$255$i>>>0);
      $or$cond57$i = $673 & $672;
      if ($or$cond57$i) {
       $674 = (($$lcssa226) + ($tsize$254$i))|0;
       HEAP32[$$lcssa224>>2] = $674;
       $675 = HEAP32[(57140)>>2]|0;
       $676 = (($675) + ($tsize$254$i))|0;
       $677 = ((($635)) + 8|0);
       $678 = $677;
       $679 = $678 & 7;
       $680 = ($679|0)==(0);
       $681 = (0 - ($678))|0;
       $682 = $681 & 7;
       $683 = $680 ? 0 : $682;
       $684 = (($635) + ($683)|0);
       $685 = (($676) - ($683))|0;
       HEAP32[(57152)>>2] = $684;
       HEAP32[(57140)>>2] = $685;
       $686 = $685 | 1;
       $$sum$i17$i = (($683) + 4)|0;
       $687 = (($635) + ($$sum$i17$i)|0);
       HEAP32[$687>>2] = $686;
       $$sum2$i18$i = (($676) + 4)|0;
       $688 = (($635) + ($$sum2$i18$i)|0);
       HEAP32[$688>>2] = 40;
       $689 = HEAP32[(57616)>>2]|0;
       HEAP32[(57156)>>2] = $689;
       break;
      }
     }
    }
    $690 = HEAP32[(57144)>>2]|0;
    $691 = ($tbase$255$i>>>0)<($690>>>0);
    if ($691) {
     HEAP32[(57144)>>2] = $tbase$255$i;
     $755 = $tbase$255$i;
    } else {
     $755 = $690;
    }
    $692 = (($tbase$255$i) + ($tsize$254$i)|0);
    $sp$183$i = (57576);
    while(1) {
     $693 = HEAP32[$sp$183$i>>2]|0;
     $694 = ($693|0)==($692|0);
     if ($694) {
      $$lcssa219 = $sp$183$i;$sp$183$i$lcssa = $sp$183$i;
      label = 212;
      break;
     }
     $695 = ((($sp$183$i)) + 8|0);
     $696 = HEAP32[$695>>2]|0;
     $697 = ($696|0)==(0|0);
     if ($697) {
      $sp$0$i$i$i = (57576);
      break;
     } else {
      $sp$183$i = $696;
     }
    }
    if ((label|0) == 212) {
     $698 = ((($sp$183$i$lcssa)) + 12|0);
     $699 = HEAP32[$698>>2]|0;
     $700 = $699 & 8;
     $701 = ($700|0)==(0);
     if ($701) {
      HEAP32[$$lcssa219>>2] = $tbase$255$i;
      $702 = ((($sp$183$i$lcssa)) + 4|0);
      $703 = HEAP32[$702>>2]|0;
      $704 = (($703) + ($tsize$254$i))|0;
      HEAP32[$702>>2] = $704;
      $705 = ((($tbase$255$i)) + 8|0);
      $706 = $705;
      $707 = $706 & 7;
      $708 = ($707|0)==(0);
      $709 = (0 - ($706))|0;
      $710 = $709 & 7;
      $711 = $708 ? 0 : $710;
      $712 = (($tbase$255$i) + ($711)|0);
      $$sum112$i = (($tsize$254$i) + 8)|0;
      $713 = (($tbase$255$i) + ($$sum112$i)|0);
      $714 = $713;
      $715 = $714 & 7;
      $716 = ($715|0)==(0);
      $717 = (0 - ($714))|0;
      $718 = $717 & 7;
      $719 = $716 ? 0 : $718;
      $$sum113$i = (($719) + ($tsize$254$i))|0;
      $720 = (($tbase$255$i) + ($$sum113$i)|0);
      $721 = $720;
      $722 = $712;
      $723 = (($721) - ($722))|0;
      $$sum$i19$i = (($711) + ($nb$0))|0;
      $724 = (($tbase$255$i) + ($$sum$i19$i)|0);
      $725 = (($723) - ($nb$0))|0;
      $726 = $nb$0 | 3;
      $$sum1$i20$i = (($711) + 4)|0;
      $727 = (($tbase$255$i) + ($$sum1$i20$i)|0);
      HEAP32[$727>>2] = $726;
      $728 = ($720|0)==($635|0);
      L324: do {
       if ($728) {
        $729 = HEAP32[(57140)>>2]|0;
        $730 = (($729) + ($725))|0;
        HEAP32[(57140)>>2] = $730;
        HEAP32[(57152)>>2] = $724;
        $731 = $730 | 1;
        $$sum42$i$i = (($$sum$i19$i) + 4)|0;
        $732 = (($tbase$255$i) + ($$sum42$i$i)|0);
        HEAP32[$732>>2] = $731;
       } else {
        $733 = HEAP32[(57148)>>2]|0;
        $734 = ($720|0)==($733|0);
        if ($734) {
         $735 = HEAP32[(57136)>>2]|0;
         $736 = (($735) + ($725))|0;
         HEAP32[(57136)>>2] = $736;
         HEAP32[(57148)>>2] = $724;
         $737 = $736 | 1;
         $$sum40$i$i = (($$sum$i19$i) + 4)|0;
         $738 = (($tbase$255$i) + ($$sum40$i$i)|0);
         HEAP32[$738>>2] = $737;
         $$sum41$i$i = (($736) + ($$sum$i19$i))|0;
         $739 = (($tbase$255$i) + ($$sum41$i$i)|0);
         HEAP32[$739>>2] = $736;
         break;
        }
        $$sum2$i21$i = (($tsize$254$i) + 4)|0;
        $$sum114$i = (($$sum2$i21$i) + ($719))|0;
        $740 = (($tbase$255$i) + ($$sum114$i)|0);
        $741 = HEAP32[$740>>2]|0;
        $742 = $741 & 3;
        $743 = ($742|0)==(1);
        if ($743) {
         $744 = $741 & -8;
         $745 = $741 >>> 3;
         $746 = ($741>>>0)<(256);
         L332: do {
          if ($746) {
           $$sum3738$i$i = $719 | 8;
           $$sum124$i = (($$sum3738$i$i) + ($tsize$254$i))|0;
           $747 = (($tbase$255$i) + ($$sum124$i)|0);
           $748 = HEAP32[$747>>2]|0;
           $$sum39$i$i = (($tsize$254$i) + 12)|0;
           $$sum125$i = (($$sum39$i$i) + ($719))|0;
           $749 = (($tbase$255$i) + ($$sum125$i)|0);
           $750 = HEAP32[$749>>2]|0;
           $751 = $745 << 1;
           $752 = (57168 + ($751<<2)|0);
           $753 = ($748|0)==($752|0);
           do {
            if (!($753)) {
             $754 = ($748>>>0)<($755>>>0);
             if ($754) {
              _abort();
              // unreachable;
             }
             $756 = ((($748)) + 12|0);
             $757 = HEAP32[$756>>2]|0;
             $758 = ($757|0)==($720|0);
             if ($758) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $759 = ($750|0)==($748|0);
           if ($759) {
            $760 = 1 << $745;
            $761 = $760 ^ -1;
            $762 = HEAP32[57128>>2]|0;
            $763 = $762 & $761;
            HEAP32[57128>>2] = $763;
            break;
           }
           $764 = ($750|0)==($752|0);
           do {
            if ($764) {
             $$pre57$i$i = ((($750)) + 8|0);
             $$pre$phi58$i$iZ2D = $$pre57$i$i;
            } else {
             $765 = ($750>>>0)<($755>>>0);
             if ($765) {
              _abort();
              // unreachable;
             }
             $766 = ((($750)) + 8|0);
             $767 = HEAP32[$766>>2]|0;
             $768 = ($767|0)==($720|0);
             if ($768) {
              $$pre$phi58$i$iZ2D = $766;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $769 = ((($748)) + 12|0);
           HEAP32[$769>>2] = $750;
           HEAP32[$$pre$phi58$i$iZ2D>>2] = $748;
          } else {
           $$sum34$i$i = $719 | 24;
           $$sum115$i = (($$sum34$i$i) + ($tsize$254$i))|0;
           $770 = (($tbase$255$i) + ($$sum115$i)|0);
           $771 = HEAP32[$770>>2]|0;
           $$sum5$i$i = (($tsize$254$i) + 12)|0;
           $$sum116$i = (($$sum5$i$i) + ($719))|0;
           $772 = (($tbase$255$i) + ($$sum116$i)|0);
           $773 = HEAP32[$772>>2]|0;
           $774 = ($773|0)==($720|0);
           do {
            if ($774) {
             $$sum67$i$i = $719 | 16;
             $$sum122$i = (($$sum2$i21$i) + ($$sum67$i$i))|0;
             $784 = (($tbase$255$i) + ($$sum122$i)|0);
             $785 = HEAP32[$784>>2]|0;
             $786 = ($785|0)==(0|0);
             if ($786) {
              $$sum123$i = (($$sum67$i$i) + ($tsize$254$i))|0;
              $787 = (($tbase$255$i) + ($$sum123$i)|0);
              $788 = HEAP32[$787>>2]|0;
              $789 = ($788|0)==(0|0);
              if ($789) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i = $788;$RP$0$i$i = $787;
              }
             } else {
              $R$0$i$i = $785;$RP$0$i$i = $784;
             }
             while(1) {
              $790 = ((($R$0$i$i)) + 20|0);
              $791 = HEAP32[$790>>2]|0;
              $792 = ($791|0)==(0|0);
              if (!($792)) {
               $R$0$i$i = $791;$RP$0$i$i = $790;
               continue;
              }
              $793 = ((($R$0$i$i)) + 16|0);
              $794 = HEAP32[$793>>2]|0;
              $795 = ($794|0)==(0|0);
              if ($795) {
               $R$0$i$i$lcssa = $R$0$i$i;$RP$0$i$i$lcssa = $RP$0$i$i;
               break;
              } else {
               $R$0$i$i = $794;$RP$0$i$i = $793;
              }
             }
             $796 = ($RP$0$i$i$lcssa>>>0)<($755>>>0);
             if ($796) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$0$i$i$lcssa>>2] = 0;
              $R$1$i$i = $R$0$i$i$lcssa;
              break;
             }
            } else {
             $$sum3536$i$i = $719 | 8;
             $$sum117$i = (($$sum3536$i$i) + ($tsize$254$i))|0;
             $775 = (($tbase$255$i) + ($$sum117$i)|0);
             $776 = HEAP32[$775>>2]|0;
             $777 = ($776>>>0)<($755>>>0);
             if ($777) {
              _abort();
              // unreachable;
             }
             $778 = ((($776)) + 12|0);
             $779 = HEAP32[$778>>2]|0;
             $780 = ($779|0)==($720|0);
             if (!($780)) {
              _abort();
              // unreachable;
             }
             $781 = ((($773)) + 8|0);
             $782 = HEAP32[$781>>2]|0;
             $783 = ($782|0)==($720|0);
             if ($783) {
              HEAP32[$778>>2] = $773;
              HEAP32[$781>>2] = $776;
              $R$1$i$i = $773;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $797 = ($771|0)==(0|0);
           if ($797) {
            break;
           }
           $$sum30$i$i = (($tsize$254$i) + 28)|0;
           $$sum118$i = (($$sum30$i$i) + ($719))|0;
           $798 = (($tbase$255$i) + ($$sum118$i)|0);
           $799 = HEAP32[$798>>2]|0;
           $800 = (57432 + ($799<<2)|0);
           $801 = HEAP32[$800>>2]|0;
           $802 = ($720|0)==($801|0);
           do {
            if ($802) {
             HEAP32[$800>>2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $803 = 1 << $799;
             $804 = $803 ^ -1;
             $805 = HEAP32[(57132)>>2]|0;
             $806 = $805 & $804;
             HEAP32[(57132)>>2] = $806;
             break L332;
            } else {
             $807 = HEAP32[(57144)>>2]|0;
             $808 = ($771>>>0)<($807>>>0);
             if ($808) {
              _abort();
              // unreachable;
             }
             $809 = ((($771)) + 16|0);
             $810 = HEAP32[$809>>2]|0;
             $811 = ($810|0)==($720|0);
             if ($811) {
              HEAP32[$809>>2] = $R$1$i$i;
             } else {
              $812 = ((($771)) + 20|0);
              HEAP32[$812>>2] = $R$1$i$i;
             }
             $813 = ($R$1$i$i|0)==(0|0);
             if ($813) {
              break L332;
             }
            }
           } while(0);
           $814 = HEAP32[(57144)>>2]|0;
           $815 = ($R$1$i$i>>>0)<($814>>>0);
           if ($815) {
            _abort();
            // unreachable;
           }
           $816 = ((($R$1$i$i)) + 24|0);
           HEAP32[$816>>2] = $771;
           $$sum3132$i$i = $719 | 16;
           $$sum119$i = (($$sum3132$i$i) + ($tsize$254$i))|0;
           $817 = (($tbase$255$i) + ($$sum119$i)|0);
           $818 = HEAP32[$817>>2]|0;
           $819 = ($818|0)==(0|0);
           do {
            if (!($819)) {
             $820 = ($818>>>0)<($814>>>0);
             if ($820) {
              _abort();
              // unreachable;
             } else {
              $821 = ((($R$1$i$i)) + 16|0);
              HEAP32[$821>>2] = $818;
              $822 = ((($818)) + 24|0);
              HEAP32[$822>>2] = $R$1$i$i;
              break;
             }
            }
           } while(0);
           $$sum120$i = (($$sum2$i21$i) + ($$sum3132$i$i))|0;
           $823 = (($tbase$255$i) + ($$sum120$i)|0);
           $824 = HEAP32[$823>>2]|0;
           $825 = ($824|0)==(0|0);
           if ($825) {
            break;
           }
           $826 = HEAP32[(57144)>>2]|0;
           $827 = ($824>>>0)<($826>>>0);
           if ($827) {
            _abort();
            // unreachable;
           } else {
            $828 = ((($R$1$i$i)) + 20|0);
            HEAP32[$828>>2] = $824;
            $829 = ((($824)) + 24|0);
            HEAP32[$829>>2] = $R$1$i$i;
            break;
           }
          }
         } while(0);
         $$sum9$i$i = $744 | $719;
         $$sum121$i = (($$sum9$i$i) + ($tsize$254$i))|0;
         $830 = (($tbase$255$i) + ($$sum121$i)|0);
         $831 = (($744) + ($725))|0;
         $oldfirst$0$i$i = $830;$qsize$0$i$i = $831;
        } else {
         $oldfirst$0$i$i = $720;$qsize$0$i$i = $725;
        }
        $832 = ((($oldfirst$0$i$i)) + 4|0);
        $833 = HEAP32[$832>>2]|0;
        $834 = $833 & -2;
        HEAP32[$832>>2] = $834;
        $835 = $qsize$0$i$i | 1;
        $$sum10$i$i = (($$sum$i19$i) + 4)|0;
        $836 = (($tbase$255$i) + ($$sum10$i$i)|0);
        HEAP32[$836>>2] = $835;
        $$sum11$i$i = (($qsize$0$i$i) + ($$sum$i19$i))|0;
        $837 = (($tbase$255$i) + ($$sum11$i$i)|0);
        HEAP32[$837>>2] = $qsize$0$i$i;
        $838 = $qsize$0$i$i >>> 3;
        $839 = ($qsize$0$i$i>>>0)<(256);
        if ($839) {
         $840 = $838 << 1;
         $841 = (57168 + ($840<<2)|0);
         $842 = HEAP32[57128>>2]|0;
         $843 = 1 << $838;
         $844 = $842 & $843;
         $845 = ($844|0)==(0);
         do {
          if ($845) {
           $846 = $842 | $843;
           HEAP32[57128>>2] = $846;
           $$pre$i22$i = (($840) + 2)|0;
           $$pre56$i$i = (57168 + ($$pre$i22$i<<2)|0);
           $$pre$phi$i23$iZ2D = $$pre56$i$i;$F4$0$i$i = $841;
          } else {
           $$sum29$i$i = (($840) + 2)|0;
           $847 = (57168 + ($$sum29$i$i<<2)|0);
           $848 = HEAP32[$847>>2]|0;
           $849 = HEAP32[(57144)>>2]|0;
           $850 = ($848>>>0)<($849>>>0);
           if (!($850)) {
            $$pre$phi$i23$iZ2D = $847;$F4$0$i$i = $848;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i23$iZ2D>>2] = $724;
         $851 = ((($F4$0$i$i)) + 12|0);
         HEAP32[$851>>2] = $724;
         $$sum27$i$i = (($$sum$i19$i) + 8)|0;
         $852 = (($tbase$255$i) + ($$sum27$i$i)|0);
         HEAP32[$852>>2] = $F4$0$i$i;
         $$sum28$i$i = (($$sum$i19$i) + 12)|0;
         $853 = (($tbase$255$i) + ($$sum28$i$i)|0);
         HEAP32[$853>>2] = $841;
         break;
        }
        $854 = $qsize$0$i$i >>> 8;
        $855 = ($854|0)==(0);
        do {
         if ($855) {
          $I7$0$i$i = 0;
         } else {
          $856 = ($qsize$0$i$i>>>0)>(16777215);
          if ($856) {
           $I7$0$i$i = 31;
           break;
          }
          $857 = (($854) + 1048320)|0;
          $858 = $857 >>> 16;
          $859 = $858 & 8;
          $860 = $854 << $859;
          $861 = (($860) + 520192)|0;
          $862 = $861 >>> 16;
          $863 = $862 & 4;
          $864 = $863 | $859;
          $865 = $860 << $863;
          $866 = (($865) + 245760)|0;
          $867 = $866 >>> 16;
          $868 = $867 & 2;
          $869 = $864 | $868;
          $870 = (14 - ($869))|0;
          $871 = $865 << $868;
          $872 = $871 >>> 15;
          $873 = (($870) + ($872))|0;
          $874 = $873 << 1;
          $875 = (($873) + 7)|0;
          $876 = $qsize$0$i$i >>> $875;
          $877 = $876 & 1;
          $878 = $877 | $874;
          $I7$0$i$i = $878;
         }
        } while(0);
        $879 = (57432 + ($I7$0$i$i<<2)|0);
        $$sum12$i$i = (($$sum$i19$i) + 28)|0;
        $880 = (($tbase$255$i) + ($$sum12$i$i)|0);
        HEAP32[$880>>2] = $I7$0$i$i;
        $$sum13$i$i = (($$sum$i19$i) + 16)|0;
        $881 = (($tbase$255$i) + ($$sum13$i$i)|0);
        $$sum14$i$i = (($$sum$i19$i) + 20)|0;
        $882 = (($tbase$255$i) + ($$sum14$i$i)|0);
        HEAP32[$882>>2] = 0;
        HEAP32[$881>>2] = 0;
        $883 = HEAP32[(57132)>>2]|0;
        $884 = 1 << $I7$0$i$i;
        $885 = $883 & $884;
        $886 = ($885|0)==(0);
        if ($886) {
         $887 = $883 | $884;
         HEAP32[(57132)>>2] = $887;
         HEAP32[$879>>2] = $724;
         $$sum15$i$i = (($$sum$i19$i) + 24)|0;
         $888 = (($tbase$255$i) + ($$sum15$i$i)|0);
         HEAP32[$888>>2] = $879;
         $$sum16$i$i = (($$sum$i19$i) + 12)|0;
         $889 = (($tbase$255$i) + ($$sum16$i$i)|0);
         HEAP32[$889>>2] = $724;
         $$sum17$i$i = (($$sum$i19$i) + 8)|0;
         $890 = (($tbase$255$i) + ($$sum17$i$i)|0);
         HEAP32[$890>>2] = $724;
         break;
        }
        $891 = HEAP32[$879>>2]|0;
        $892 = ((($891)) + 4|0);
        $893 = HEAP32[$892>>2]|0;
        $894 = $893 & -8;
        $895 = ($894|0)==($qsize$0$i$i|0);
        L418: do {
         if ($895) {
          $T$0$lcssa$i25$i = $891;
         } else {
          $896 = ($I7$0$i$i|0)==(31);
          $897 = $I7$0$i$i >>> 1;
          $898 = (25 - ($897))|0;
          $899 = $896 ? 0 : $898;
          $900 = $qsize$0$i$i << $899;
          $K8$051$i$i = $900;$T$050$i$i = $891;
          while(1) {
           $907 = $K8$051$i$i >>> 31;
           $908 = (((($T$050$i$i)) + 16|0) + ($907<<2)|0);
           $903 = HEAP32[$908>>2]|0;
           $909 = ($903|0)==(0|0);
           if ($909) {
            $$lcssa = $908;$T$050$i$i$lcssa = $T$050$i$i;
            break;
           }
           $901 = $K8$051$i$i << 1;
           $902 = ((($903)) + 4|0);
           $904 = HEAP32[$902>>2]|0;
           $905 = $904 & -8;
           $906 = ($905|0)==($qsize$0$i$i|0);
           if ($906) {
            $T$0$lcssa$i25$i = $903;
            break L418;
           } else {
            $K8$051$i$i = $901;$T$050$i$i = $903;
           }
          }
          $910 = HEAP32[(57144)>>2]|0;
          $911 = ($$lcssa>>>0)<($910>>>0);
          if ($911) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$$lcssa>>2] = $724;
           $$sum23$i$i = (($$sum$i19$i) + 24)|0;
           $912 = (($tbase$255$i) + ($$sum23$i$i)|0);
           HEAP32[$912>>2] = $T$050$i$i$lcssa;
           $$sum24$i$i = (($$sum$i19$i) + 12)|0;
           $913 = (($tbase$255$i) + ($$sum24$i$i)|0);
           HEAP32[$913>>2] = $724;
           $$sum25$i$i = (($$sum$i19$i) + 8)|0;
           $914 = (($tbase$255$i) + ($$sum25$i$i)|0);
           HEAP32[$914>>2] = $724;
           break L324;
          }
         }
        } while(0);
        $915 = ((($T$0$lcssa$i25$i)) + 8|0);
        $916 = HEAP32[$915>>2]|0;
        $917 = HEAP32[(57144)>>2]|0;
        $918 = ($916>>>0)>=($917>>>0);
        $not$$i26$i = ($T$0$lcssa$i25$i>>>0)>=($917>>>0);
        $919 = $918 & $not$$i26$i;
        if ($919) {
         $920 = ((($916)) + 12|0);
         HEAP32[$920>>2] = $724;
         HEAP32[$915>>2] = $724;
         $$sum20$i$i = (($$sum$i19$i) + 8)|0;
         $921 = (($tbase$255$i) + ($$sum20$i$i)|0);
         HEAP32[$921>>2] = $916;
         $$sum21$i$i = (($$sum$i19$i) + 12)|0;
         $922 = (($tbase$255$i) + ($$sum21$i$i)|0);
         HEAP32[$922>>2] = $T$0$lcssa$i25$i;
         $$sum22$i$i = (($$sum$i19$i) + 24)|0;
         $923 = (($tbase$255$i) + ($$sum22$i$i)|0);
         HEAP32[$923>>2] = 0;
         break;
        } else {
         _abort();
         // unreachable;
        }
       }
      } while(0);
      $$sum1819$i$i = $711 | 8;
      $924 = (($tbase$255$i) + ($$sum1819$i$i)|0);
      $mem$0 = $924;
      return ($mem$0|0);
     } else {
      $sp$0$i$i$i = (57576);
     }
    }
    while(1) {
     $925 = HEAP32[$sp$0$i$i$i>>2]|0;
     $926 = ($925>>>0)>($635>>>0);
     if (!($926)) {
      $927 = ((($sp$0$i$i$i)) + 4|0);
      $928 = HEAP32[$927>>2]|0;
      $929 = (($925) + ($928)|0);
      $930 = ($929>>>0)>($635>>>0);
      if ($930) {
       $$lcssa215 = $925;$$lcssa216 = $928;$$lcssa217 = $929;
       break;
      }
     }
     $931 = ((($sp$0$i$i$i)) + 8|0);
     $932 = HEAP32[$931>>2]|0;
     $sp$0$i$i$i = $932;
    }
    $$sum$i14$i = (($$lcssa216) + -47)|0;
    $$sum1$i15$i = (($$lcssa216) + -39)|0;
    $933 = (($$lcssa215) + ($$sum1$i15$i)|0);
    $934 = $933;
    $935 = $934 & 7;
    $936 = ($935|0)==(0);
    $937 = (0 - ($934))|0;
    $938 = $937 & 7;
    $939 = $936 ? 0 : $938;
    $$sum2$i16$i = (($$sum$i14$i) + ($939))|0;
    $940 = (($$lcssa215) + ($$sum2$i16$i)|0);
    $941 = ((($635)) + 16|0);
    $942 = ($940>>>0)<($941>>>0);
    $943 = $942 ? $635 : $940;
    $944 = ((($943)) + 8|0);
    $945 = (($tsize$254$i) + -40)|0;
    $946 = ((($tbase$255$i)) + 8|0);
    $947 = $946;
    $948 = $947 & 7;
    $949 = ($948|0)==(0);
    $950 = (0 - ($947))|0;
    $951 = $950 & 7;
    $952 = $949 ? 0 : $951;
    $953 = (($tbase$255$i) + ($952)|0);
    $954 = (($945) - ($952))|0;
    HEAP32[(57152)>>2] = $953;
    HEAP32[(57140)>>2] = $954;
    $955 = $954 | 1;
    $$sum$i$i$i = (($952) + 4)|0;
    $956 = (($tbase$255$i) + ($$sum$i$i$i)|0);
    HEAP32[$956>>2] = $955;
    $$sum2$i$i$i = (($tsize$254$i) + -36)|0;
    $957 = (($tbase$255$i) + ($$sum2$i$i$i)|0);
    HEAP32[$957>>2] = 40;
    $958 = HEAP32[(57616)>>2]|0;
    HEAP32[(57156)>>2] = $958;
    $959 = ((($943)) + 4|0);
    HEAP32[$959>>2] = 27;
    ;HEAP32[$944>>2]=HEAP32[(57576)>>2]|0;HEAP32[$944+4>>2]=HEAP32[(57576)+4>>2]|0;HEAP32[$944+8>>2]=HEAP32[(57576)+8>>2]|0;HEAP32[$944+12>>2]=HEAP32[(57576)+12>>2]|0;
    HEAP32[(57576)>>2] = $tbase$255$i;
    HEAP32[(57580)>>2] = $tsize$254$i;
    HEAP32[(57588)>>2] = 0;
    HEAP32[(57584)>>2] = $944;
    $960 = ((($943)) + 28|0);
    HEAP32[$960>>2] = 7;
    $961 = ((($943)) + 32|0);
    $962 = ($961>>>0)<($$lcssa217>>>0);
    if ($962) {
     $964 = $960;
     while(1) {
      $963 = ((($964)) + 4|0);
      HEAP32[$963>>2] = 7;
      $965 = ((($964)) + 8|0);
      $966 = ($965>>>0)<($$lcssa217>>>0);
      if ($966) {
       $964 = $963;
      } else {
       break;
      }
     }
    }
    $967 = ($943|0)==($635|0);
    if (!($967)) {
     $968 = $943;
     $969 = $635;
     $970 = (($968) - ($969))|0;
     $971 = HEAP32[$959>>2]|0;
     $972 = $971 & -2;
     HEAP32[$959>>2] = $972;
     $973 = $970 | 1;
     $974 = ((($635)) + 4|0);
     HEAP32[$974>>2] = $973;
     HEAP32[$943>>2] = $970;
     $975 = $970 >>> 3;
     $976 = ($970>>>0)<(256);
     if ($976) {
      $977 = $975 << 1;
      $978 = (57168 + ($977<<2)|0);
      $979 = HEAP32[57128>>2]|0;
      $980 = 1 << $975;
      $981 = $979 & $980;
      $982 = ($981|0)==(0);
      if ($982) {
       $983 = $979 | $980;
       HEAP32[57128>>2] = $983;
       $$pre$i$i = (($977) + 2)|0;
       $$pre14$i$i = (57168 + ($$pre$i$i<<2)|0);
       $$pre$phi$i$iZ2D = $$pre14$i$i;$F$0$i$i = $978;
      } else {
       $$sum4$i$i = (($977) + 2)|0;
       $984 = (57168 + ($$sum4$i$i<<2)|0);
       $985 = HEAP32[$984>>2]|0;
       $986 = HEAP32[(57144)>>2]|0;
       $987 = ($985>>>0)<($986>>>0);
       if ($987) {
        _abort();
        // unreachable;
       } else {
        $$pre$phi$i$iZ2D = $984;$F$0$i$i = $985;
       }
      }
      HEAP32[$$pre$phi$i$iZ2D>>2] = $635;
      $988 = ((($F$0$i$i)) + 12|0);
      HEAP32[$988>>2] = $635;
      $989 = ((($635)) + 8|0);
      HEAP32[$989>>2] = $F$0$i$i;
      $990 = ((($635)) + 12|0);
      HEAP32[$990>>2] = $978;
      break;
     }
     $991 = $970 >>> 8;
     $992 = ($991|0)==(0);
     if ($992) {
      $I1$0$i$i = 0;
     } else {
      $993 = ($970>>>0)>(16777215);
      if ($993) {
       $I1$0$i$i = 31;
      } else {
       $994 = (($991) + 1048320)|0;
       $995 = $994 >>> 16;
       $996 = $995 & 8;
       $997 = $991 << $996;
       $998 = (($997) + 520192)|0;
       $999 = $998 >>> 16;
       $1000 = $999 & 4;
       $1001 = $1000 | $996;
       $1002 = $997 << $1000;
       $1003 = (($1002) + 245760)|0;
       $1004 = $1003 >>> 16;
       $1005 = $1004 & 2;
       $1006 = $1001 | $1005;
       $1007 = (14 - ($1006))|0;
       $1008 = $1002 << $1005;
       $1009 = $1008 >>> 15;
       $1010 = (($1007) + ($1009))|0;
       $1011 = $1010 << 1;
       $1012 = (($1010) + 7)|0;
       $1013 = $970 >>> $1012;
       $1014 = $1013 & 1;
       $1015 = $1014 | $1011;
       $I1$0$i$i = $1015;
      }
     }
     $1016 = (57432 + ($I1$0$i$i<<2)|0);
     $1017 = ((($635)) + 28|0);
     HEAP32[$1017>>2] = $I1$0$i$i;
     $1018 = ((($635)) + 20|0);
     HEAP32[$1018>>2] = 0;
     HEAP32[$941>>2] = 0;
     $1019 = HEAP32[(57132)>>2]|0;
     $1020 = 1 << $I1$0$i$i;
     $1021 = $1019 & $1020;
     $1022 = ($1021|0)==(0);
     if ($1022) {
      $1023 = $1019 | $1020;
      HEAP32[(57132)>>2] = $1023;
      HEAP32[$1016>>2] = $635;
      $1024 = ((($635)) + 24|0);
      HEAP32[$1024>>2] = $1016;
      $1025 = ((($635)) + 12|0);
      HEAP32[$1025>>2] = $635;
      $1026 = ((($635)) + 8|0);
      HEAP32[$1026>>2] = $635;
      break;
     }
     $1027 = HEAP32[$1016>>2]|0;
     $1028 = ((($1027)) + 4|0);
     $1029 = HEAP32[$1028>>2]|0;
     $1030 = $1029 & -8;
     $1031 = ($1030|0)==($970|0);
     L459: do {
      if ($1031) {
       $T$0$lcssa$i$i = $1027;
      } else {
       $1032 = ($I1$0$i$i|0)==(31);
       $1033 = $I1$0$i$i >>> 1;
       $1034 = (25 - ($1033))|0;
       $1035 = $1032 ? 0 : $1034;
       $1036 = $970 << $1035;
       $K2$07$i$i = $1036;$T$06$i$i = $1027;
       while(1) {
        $1043 = $K2$07$i$i >>> 31;
        $1044 = (((($T$06$i$i)) + 16|0) + ($1043<<2)|0);
        $1039 = HEAP32[$1044>>2]|0;
        $1045 = ($1039|0)==(0|0);
        if ($1045) {
         $$lcssa211 = $1044;$T$06$i$i$lcssa = $T$06$i$i;
         break;
        }
        $1037 = $K2$07$i$i << 1;
        $1038 = ((($1039)) + 4|0);
        $1040 = HEAP32[$1038>>2]|0;
        $1041 = $1040 & -8;
        $1042 = ($1041|0)==($970|0);
        if ($1042) {
         $T$0$lcssa$i$i = $1039;
         break L459;
        } else {
         $K2$07$i$i = $1037;$T$06$i$i = $1039;
        }
       }
       $1046 = HEAP32[(57144)>>2]|0;
       $1047 = ($$lcssa211>>>0)<($1046>>>0);
       if ($1047) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$$lcssa211>>2] = $635;
        $1048 = ((($635)) + 24|0);
        HEAP32[$1048>>2] = $T$06$i$i$lcssa;
        $1049 = ((($635)) + 12|0);
        HEAP32[$1049>>2] = $635;
        $1050 = ((($635)) + 8|0);
        HEAP32[$1050>>2] = $635;
        break L299;
       }
      }
     } while(0);
     $1051 = ((($T$0$lcssa$i$i)) + 8|0);
     $1052 = HEAP32[$1051>>2]|0;
     $1053 = HEAP32[(57144)>>2]|0;
     $1054 = ($1052>>>0)>=($1053>>>0);
     $not$$i$i = ($T$0$lcssa$i$i>>>0)>=($1053>>>0);
     $1055 = $1054 & $not$$i$i;
     if ($1055) {
      $1056 = ((($1052)) + 12|0);
      HEAP32[$1056>>2] = $635;
      HEAP32[$1051>>2] = $635;
      $1057 = ((($635)) + 8|0);
      HEAP32[$1057>>2] = $1052;
      $1058 = ((($635)) + 12|0);
      HEAP32[$1058>>2] = $T$0$lcssa$i$i;
      $1059 = ((($635)) + 24|0);
      HEAP32[$1059>>2] = 0;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   }
  } while(0);
  $1060 = HEAP32[(57140)>>2]|0;
  $1061 = ($1060>>>0)>($nb$0>>>0);
  if ($1061) {
   $1062 = (($1060) - ($nb$0))|0;
   HEAP32[(57140)>>2] = $1062;
   $1063 = HEAP32[(57152)>>2]|0;
   $1064 = (($1063) + ($nb$0)|0);
   HEAP32[(57152)>>2] = $1064;
   $1065 = $1062 | 1;
   $$sum$i32 = (($nb$0) + 4)|0;
   $1066 = (($1063) + ($$sum$i32)|0);
   HEAP32[$1066>>2] = $1065;
   $1067 = $nb$0 | 3;
   $1068 = ((($1063)) + 4|0);
   HEAP32[$1068>>2] = $1067;
   $1069 = ((($1063)) + 8|0);
   $mem$0 = $1069;
   return ($mem$0|0);
  }
 }
 $1070 = (___errno_location()|0);
 HEAP32[$1070>>2] = 12;
 $mem$0 = 0;
 return ($mem$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$lcssa = 0, $$pre = 0, $$pre$phi59Z2D = 0, $$pre$phi61Z2D = 0, $$pre$phiZ2D = 0, $$pre57 = 0, $$pre58 = 0, $$pre60 = 0, $$sum = 0, $$sum11 = 0, $$sum12 = 0, $$sum13 = 0, $$sum14 = 0, $$sum1718 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum22 = 0, $$sum23 = 0, $$sum24 = 0;
 var $$sum25 = 0, $$sum26 = 0, $$sum27 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0, $$sum31 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0;
 var $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0;
 var $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0;
 var $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0;
 var $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0;
 var $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0;
 var $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0;
 var $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0;
 var $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0;
 var $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0;
 var $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0;
 var $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0;
 var $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0;
 var $321 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0;
 var $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0;
 var $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $K19$052 = 0, $R$0 = 0, $R$0$lcssa = 0, $R$1 = 0;
 var $R7$0 = 0, $R7$0$lcssa = 0, $R7$1 = 0, $RP$0 = 0, $RP$0$lcssa = 0, $RP9$0 = 0, $RP9$0$lcssa = 0, $T$0$lcssa = 0, $T$051 = 0, $T$051$lcssa = 0, $cond = 0, $cond47 = 0, $not$ = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = ((($mem)) + -8|0);
 $2 = HEAP32[(57144)>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = ((($mem)) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $$sum = (($8) + -8)|0;
 $9 = (($mem) + ($$sum)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    return;
   }
   $$sum2 = (-8 - ($12))|0;
   $14 = (($mem) + ($$sum2)|0);
   $15 = (($12) + ($8))|0;
   $16 = ($14>>>0)<($2>>>0);
   if ($16) {
    _abort();
    // unreachable;
   }
   $17 = HEAP32[(57148)>>2]|0;
   $18 = ($14|0)==($17|0);
   if ($18) {
    $$sum3 = (($8) + -4)|0;
    $103 = (($mem) + ($$sum3)|0);
    $104 = HEAP32[$103>>2]|0;
    $105 = $104 & 3;
    $106 = ($105|0)==(3);
    if (!($106)) {
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    HEAP32[(57136)>>2] = $15;
    $107 = $104 & -2;
    HEAP32[$103>>2] = $107;
    $108 = $15 | 1;
    $$sum20 = (($$sum2) + 4)|0;
    $109 = (($mem) + ($$sum20)|0);
    HEAP32[$109>>2] = $108;
    HEAP32[$9>>2] = $15;
    return;
   }
   $19 = $12 >>> 3;
   $20 = ($12>>>0)<(256);
   if ($20) {
    $$sum30 = (($$sum2) + 8)|0;
    $21 = (($mem) + ($$sum30)|0);
    $22 = HEAP32[$21>>2]|0;
    $$sum31 = (($$sum2) + 12)|0;
    $23 = (($mem) + ($$sum31)|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $19 << 1;
    $26 = (57168 + ($25<<2)|0);
    $27 = ($22|0)==($26|0);
    if (!($27)) {
     $28 = ($22>>>0)<($2>>>0);
     if ($28) {
      _abort();
      // unreachable;
     }
     $29 = ((($22)) + 12|0);
     $30 = HEAP32[$29>>2]|0;
     $31 = ($30|0)==($14|0);
     if (!($31)) {
      _abort();
      // unreachable;
     }
    }
    $32 = ($24|0)==($22|0);
    if ($32) {
     $33 = 1 << $19;
     $34 = $33 ^ -1;
     $35 = HEAP32[57128>>2]|0;
     $36 = $35 & $34;
     HEAP32[57128>>2] = $36;
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    $37 = ($24|0)==($26|0);
    if ($37) {
     $$pre60 = ((($24)) + 8|0);
     $$pre$phi61Z2D = $$pre60;
    } else {
     $38 = ($24>>>0)<($2>>>0);
     if ($38) {
      _abort();
      // unreachable;
     }
     $39 = ((($24)) + 8|0);
     $40 = HEAP32[$39>>2]|0;
     $41 = ($40|0)==($14|0);
     if ($41) {
      $$pre$phi61Z2D = $39;
     } else {
      _abort();
      // unreachable;
     }
    }
    $42 = ((($22)) + 12|0);
    HEAP32[$42>>2] = $24;
    HEAP32[$$pre$phi61Z2D>>2] = $22;
    $p$0 = $14;$psize$0 = $15;
    break;
   }
   $$sum22 = (($$sum2) + 24)|0;
   $43 = (($mem) + ($$sum22)|0);
   $44 = HEAP32[$43>>2]|0;
   $$sum23 = (($$sum2) + 12)|0;
   $45 = (($mem) + ($$sum23)|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ($46|0)==($14|0);
   do {
    if ($47) {
     $$sum25 = (($$sum2) + 20)|0;
     $57 = (($mem) + ($$sum25)|0);
     $58 = HEAP32[$57>>2]|0;
     $59 = ($58|0)==(0|0);
     if ($59) {
      $$sum24 = (($$sum2) + 16)|0;
      $60 = (($mem) + ($$sum24)|0);
      $61 = HEAP32[$60>>2]|0;
      $62 = ($61|0)==(0|0);
      if ($62) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $61;$RP$0 = $60;
      }
     } else {
      $R$0 = $58;$RP$0 = $57;
     }
     while(1) {
      $63 = ((($R$0)) + 20|0);
      $64 = HEAP32[$63>>2]|0;
      $65 = ($64|0)==(0|0);
      if (!($65)) {
       $R$0 = $64;$RP$0 = $63;
       continue;
      }
      $66 = ((($R$0)) + 16|0);
      $67 = HEAP32[$66>>2]|0;
      $68 = ($67|0)==(0|0);
      if ($68) {
       $R$0$lcssa = $R$0;$RP$0$lcssa = $RP$0;
       break;
      } else {
       $R$0 = $67;$RP$0 = $66;
      }
     }
     $69 = ($RP$0$lcssa>>>0)<($2>>>0);
     if ($69) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0$lcssa>>2] = 0;
      $R$1 = $R$0$lcssa;
      break;
     }
    } else {
     $$sum29 = (($$sum2) + 8)|0;
     $48 = (($mem) + ($$sum29)|0);
     $49 = HEAP32[$48>>2]|0;
     $50 = ($49>>>0)<($2>>>0);
     if ($50) {
      _abort();
      // unreachable;
     }
     $51 = ((($49)) + 12|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)==($14|0);
     if (!($53)) {
      _abort();
      // unreachable;
     }
     $54 = ((($46)) + 8|0);
     $55 = HEAP32[$54>>2]|0;
     $56 = ($55|0)==($14|0);
     if ($56) {
      HEAP32[$51>>2] = $46;
      HEAP32[$54>>2] = $49;
      $R$1 = $46;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $70 = ($44|0)==(0|0);
   if ($70) {
    $p$0 = $14;$psize$0 = $15;
   } else {
    $$sum26 = (($$sum2) + 28)|0;
    $71 = (($mem) + ($$sum26)|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = (57432 + ($72<<2)|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = ($14|0)==($74|0);
    if ($75) {
     HEAP32[$73>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[(57132)>>2]|0;
      $79 = $78 & $77;
      HEAP32[(57132)>>2] = $79;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[(57144)>>2]|0;
     $81 = ($44>>>0)<($80>>>0);
     if ($81) {
      _abort();
      // unreachable;
     }
     $82 = ((($44)) + 16|0);
     $83 = HEAP32[$82>>2]|0;
     $84 = ($83|0)==($14|0);
     if ($84) {
      HEAP32[$82>>2] = $R$1;
     } else {
      $85 = ((($44)) + 20|0);
      HEAP32[$85>>2] = $R$1;
     }
     $86 = ($R$1|0)==(0|0);
     if ($86) {
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[(57144)>>2]|0;
    $88 = ($R$1>>>0)<($87>>>0);
    if ($88) {
     _abort();
     // unreachable;
    }
    $89 = ((($R$1)) + 24|0);
    HEAP32[$89>>2] = $44;
    $$sum27 = (($$sum2) + 16)|0;
    $90 = (($mem) + ($$sum27)|0);
    $91 = HEAP32[$90>>2]|0;
    $92 = ($91|0)==(0|0);
    do {
     if (!($92)) {
      $93 = ($91>>>0)<($87>>>0);
      if ($93) {
       _abort();
       // unreachable;
      } else {
       $94 = ((($R$1)) + 16|0);
       HEAP32[$94>>2] = $91;
       $95 = ((($91)) + 24|0);
       HEAP32[$95>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum28 = (($$sum2) + 20)|0;
    $96 = (($mem) + ($$sum28)|0);
    $97 = HEAP32[$96>>2]|0;
    $98 = ($97|0)==(0|0);
    if ($98) {
     $p$0 = $14;$psize$0 = $15;
    } else {
     $99 = HEAP32[(57144)>>2]|0;
     $100 = ($97>>>0)<($99>>>0);
     if ($100) {
      _abort();
      // unreachable;
     } else {
      $101 = ((($R$1)) + 20|0);
      HEAP32[$101>>2] = $97;
      $102 = ((($97)) + 24|0);
      HEAP32[$102>>2] = $R$1;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
   }
  } else {
   $p$0 = $1;$psize$0 = $8;
  }
 } while(0);
 $110 = ($p$0>>>0)<($9>>>0);
 if (!($110)) {
  _abort();
  // unreachable;
 }
 $$sum19 = (($8) + -4)|0;
 $111 = (($mem) + ($$sum19)|0);
 $112 = HEAP32[$111>>2]|0;
 $113 = $112 & 1;
 $114 = ($113|0)==(0);
 if ($114) {
  _abort();
  // unreachable;
 }
 $115 = $112 & 2;
 $116 = ($115|0)==(0);
 if ($116) {
  $117 = HEAP32[(57152)>>2]|0;
  $118 = ($9|0)==($117|0);
  if ($118) {
   $119 = HEAP32[(57140)>>2]|0;
   $120 = (($119) + ($psize$0))|0;
   HEAP32[(57140)>>2] = $120;
   HEAP32[(57152)>>2] = $p$0;
   $121 = $120 | 1;
   $122 = ((($p$0)) + 4|0);
   HEAP32[$122>>2] = $121;
   $123 = HEAP32[(57148)>>2]|0;
   $124 = ($p$0|0)==($123|0);
   if (!($124)) {
    return;
   }
   HEAP32[(57148)>>2] = 0;
   HEAP32[(57136)>>2] = 0;
   return;
  }
  $125 = HEAP32[(57148)>>2]|0;
  $126 = ($9|0)==($125|0);
  if ($126) {
   $127 = HEAP32[(57136)>>2]|0;
   $128 = (($127) + ($psize$0))|0;
   HEAP32[(57136)>>2] = $128;
   HEAP32[(57148)>>2] = $p$0;
   $129 = $128 | 1;
   $130 = ((($p$0)) + 4|0);
   HEAP32[$130>>2] = $129;
   $131 = (($p$0) + ($128)|0);
   HEAP32[$131>>2] = $128;
   return;
  }
  $132 = $112 & -8;
  $133 = (($132) + ($psize$0))|0;
  $134 = $112 >>> 3;
  $135 = ($112>>>0)<(256);
  do {
   if ($135) {
    $136 = (($mem) + ($8)|0);
    $137 = HEAP32[$136>>2]|0;
    $$sum1718 = $8 | 4;
    $138 = (($mem) + ($$sum1718)|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = $134 << 1;
    $141 = (57168 + ($140<<2)|0);
    $142 = ($137|0)==($141|0);
    if (!($142)) {
     $143 = HEAP32[(57144)>>2]|0;
     $144 = ($137>>>0)<($143>>>0);
     if ($144) {
      _abort();
      // unreachable;
     }
     $145 = ((($137)) + 12|0);
     $146 = HEAP32[$145>>2]|0;
     $147 = ($146|0)==($9|0);
     if (!($147)) {
      _abort();
      // unreachable;
     }
    }
    $148 = ($139|0)==($137|0);
    if ($148) {
     $149 = 1 << $134;
     $150 = $149 ^ -1;
     $151 = HEAP32[57128>>2]|0;
     $152 = $151 & $150;
     HEAP32[57128>>2] = $152;
     break;
    }
    $153 = ($139|0)==($141|0);
    if ($153) {
     $$pre58 = ((($139)) + 8|0);
     $$pre$phi59Z2D = $$pre58;
    } else {
     $154 = HEAP32[(57144)>>2]|0;
     $155 = ($139>>>0)<($154>>>0);
     if ($155) {
      _abort();
      // unreachable;
     }
     $156 = ((($139)) + 8|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($9|0);
     if ($158) {
      $$pre$phi59Z2D = $156;
     } else {
      _abort();
      // unreachable;
     }
    }
    $159 = ((($137)) + 12|0);
    HEAP32[$159>>2] = $139;
    HEAP32[$$pre$phi59Z2D>>2] = $137;
   } else {
    $$sum5 = (($8) + 16)|0;
    $160 = (($mem) + ($$sum5)|0);
    $161 = HEAP32[$160>>2]|0;
    $$sum67 = $8 | 4;
    $162 = (($mem) + ($$sum67)|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ($163|0)==($9|0);
    do {
     if ($164) {
      $$sum9 = (($8) + 12)|0;
      $175 = (($mem) + ($$sum9)|0);
      $176 = HEAP32[$175>>2]|0;
      $177 = ($176|0)==(0|0);
      if ($177) {
       $$sum8 = (($8) + 8)|0;
       $178 = (($mem) + ($$sum8)|0);
       $179 = HEAP32[$178>>2]|0;
       $180 = ($179|0)==(0|0);
       if ($180) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $179;$RP9$0 = $178;
       }
      } else {
       $R7$0 = $176;$RP9$0 = $175;
      }
      while(1) {
       $181 = ((($R7$0)) + 20|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ($182|0)==(0|0);
       if (!($183)) {
        $R7$0 = $182;$RP9$0 = $181;
        continue;
       }
       $184 = ((($R7$0)) + 16|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($185|0)==(0|0);
       if ($186) {
        $R7$0$lcssa = $R7$0;$RP9$0$lcssa = $RP9$0;
        break;
       } else {
        $R7$0 = $185;$RP9$0 = $184;
       }
      }
      $187 = HEAP32[(57144)>>2]|0;
      $188 = ($RP9$0$lcssa>>>0)<($187>>>0);
      if ($188) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0$lcssa>>2] = 0;
       $R7$1 = $R7$0$lcssa;
       break;
      }
     } else {
      $165 = (($mem) + ($8)|0);
      $166 = HEAP32[$165>>2]|0;
      $167 = HEAP32[(57144)>>2]|0;
      $168 = ($166>>>0)<($167>>>0);
      if ($168) {
       _abort();
       // unreachable;
      }
      $169 = ((($166)) + 12|0);
      $170 = HEAP32[$169>>2]|0;
      $171 = ($170|0)==($9|0);
      if (!($171)) {
       _abort();
       // unreachable;
      }
      $172 = ((($163)) + 8|0);
      $173 = HEAP32[$172>>2]|0;
      $174 = ($173|0)==($9|0);
      if ($174) {
       HEAP32[$169>>2] = $163;
       HEAP32[$172>>2] = $166;
       $R7$1 = $163;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $189 = ($161|0)==(0|0);
    if (!($189)) {
     $$sum12 = (($8) + 20)|0;
     $190 = (($mem) + ($$sum12)|0);
     $191 = HEAP32[$190>>2]|0;
     $192 = (57432 + ($191<<2)|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = ($9|0)==($193|0);
     if ($194) {
      HEAP32[$192>>2] = $R7$1;
      $cond47 = ($R7$1|0)==(0|0);
      if ($cond47) {
       $195 = 1 << $191;
       $196 = $195 ^ -1;
       $197 = HEAP32[(57132)>>2]|0;
       $198 = $197 & $196;
       HEAP32[(57132)>>2] = $198;
       break;
      }
     } else {
      $199 = HEAP32[(57144)>>2]|0;
      $200 = ($161>>>0)<($199>>>0);
      if ($200) {
       _abort();
       // unreachable;
      }
      $201 = ((($161)) + 16|0);
      $202 = HEAP32[$201>>2]|0;
      $203 = ($202|0)==($9|0);
      if ($203) {
       HEAP32[$201>>2] = $R7$1;
      } else {
       $204 = ((($161)) + 20|0);
       HEAP32[$204>>2] = $R7$1;
      }
      $205 = ($R7$1|0)==(0|0);
      if ($205) {
       break;
      }
     }
     $206 = HEAP32[(57144)>>2]|0;
     $207 = ($R7$1>>>0)<($206>>>0);
     if ($207) {
      _abort();
      // unreachable;
     }
     $208 = ((($R7$1)) + 24|0);
     HEAP32[$208>>2] = $161;
     $$sum13 = (($8) + 8)|0;
     $209 = (($mem) + ($$sum13)|0);
     $210 = HEAP32[$209>>2]|0;
     $211 = ($210|0)==(0|0);
     do {
      if (!($211)) {
       $212 = ($210>>>0)<($206>>>0);
       if ($212) {
        _abort();
        // unreachable;
       } else {
        $213 = ((($R7$1)) + 16|0);
        HEAP32[$213>>2] = $210;
        $214 = ((($210)) + 24|0);
        HEAP32[$214>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum14 = (($8) + 12)|0;
     $215 = (($mem) + ($$sum14)|0);
     $216 = HEAP32[$215>>2]|0;
     $217 = ($216|0)==(0|0);
     if (!($217)) {
      $218 = HEAP32[(57144)>>2]|0;
      $219 = ($216>>>0)<($218>>>0);
      if ($219) {
       _abort();
       // unreachable;
      } else {
       $220 = ((($R7$1)) + 20|0);
       HEAP32[$220>>2] = $216;
       $221 = ((($216)) + 24|0);
       HEAP32[$221>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $222 = $133 | 1;
  $223 = ((($p$0)) + 4|0);
  HEAP32[$223>>2] = $222;
  $224 = (($p$0) + ($133)|0);
  HEAP32[$224>>2] = $133;
  $225 = HEAP32[(57148)>>2]|0;
  $226 = ($p$0|0)==($225|0);
  if ($226) {
   HEAP32[(57136)>>2] = $133;
   return;
  } else {
   $psize$1 = $133;
  }
 } else {
  $227 = $112 & -2;
  HEAP32[$111>>2] = $227;
  $228 = $psize$0 | 1;
  $229 = ((($p$0)) + 4|0);
  HEAP32[$229>>2] = $228;
  $230 = (($p$0) + ($psize$0)|0);
  HEAP32[$230>>2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 $232 = ($psize$1>>>0)<(256);
 if ($232) {
  $233 = $231 << 1;
  $234 = (57168 + ($233<<2)|0);
  $235 = HEAP32[57128>>2]|0;
  $236 = 1 << $231;
  $237 = $235 & $236;
  $238 = ($237|0)==(0);
  if ($238) {
   $239 = $235 | $236;
   HEAP32[57128>>2] = $239;
   $$pre = (($233) + 2)|0;
   $$pre57 = (57168 + ($$pre<<2)|0);
   $$pre$phiZ2D = $$pre57;$F16$0 = $234;
  } else {
   $$sum11 = (($233) + 2)|0;
   $240 = (57168 + ($$sum11<<2)|0);
   $241 = HEAP32[$240>>2]|0;
   $242 = HEAP32[(57144)>>2]|0;
   $243 = ($241>>>0)<($242>>>0);
   if ($243) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $240;$F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$0;
  $244 = ((($F16$0)) + 12|0);
  HEAP32[$244>>2] = $p$0;
  $245 = ((($p$0)) + 8|0);
  HEAP32[$245>>2] = $F16$0;
  $246 = ((($p$0)) + 12|0);
  HEAP32[$246>>2] = $234;
  return;
 }
 $247 = $psize$1 >>> 8;
 $248 = ($247|0)==(0);
 if ($248) {
  $I18$0 = 0;
 } else {
  $249 = ($psize$1>>>0)>(16777215);
  if ($249) {
   $I18$0 = 31;
  } else {
   $250 = (($247) + 1048320)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 8;
   $253 = $247 << $252;
   $254 = (($253) + 520192)|0;
   $255 = $254 >>> 16;
   $256 = $255 & 4;
   $257 = $256 | $252;
   $258 = $253 << $256;
   $259 = (($258) + 245760)|0;
   $260 = $259 >>> 16;
   $261 = $260 & 2;
   $262 = $257 | $261;
   $263 = (14 - ($262))|0;
   $264 = $258 << $261;
   $265 = $264 >>> 15;
   $266 = (($263) + ($265))|0;
   $267 = $266 << 1;
   $268 = (($266) + 7)|0;
   $269 = $psize$1 >>> $268;
   $270 = $269 & 1;
   $271 = $270 | $267;
   $I18$0 = $271;
  }
 }
 $272 = (57432 + ($I18$0<<2)|0);
 $273 = ((($p$0)) + 28|0);
 HEAP32[$273>>2] = $I18$0;
 $274 = ((($p$0)) + 16|0);
 $275 = ((($p$0)) + 20|0);
 HEAP32[$275>>2] = 0;
 HEAP32[$274>>2] = 0;
 $276 = HEAP32[(57132)>>2]|0;
 $277 = 1 << $I18$0;
 $278 = $276 & $277;
 $279 = ($278|0)==(0);
 L199: do {
  if ($279) {
   $280 = $276 | $277;
   HEAP32[(57132)>>2] = $280;
   HEAP32[$272>>2] = $p$0;
   $281 = ((($p$0)) + 24|0);
   HEAP32[$281>>2] = $272;
   $282 = ((($p$0)) + 12|0);
   HEAP32[$282>>2] = $p$0;
   $283 = ((($p$0)) + 8|0);
   HEAP32[$283>>2] = $p$0;
  } else {
   $284 = HEAP32[$272>>2]|0;
   $285 = ((($284)) + 4|0);
   $286 = HEAP32[$285>>2]|0;
   $287 = $286 & -8;
   $288 = ($287|0)==($psize$1|0);
   L202: do {
    if ($288) {
     $T$0$lcssa = $284;
    } else {
     $289 = ($I18$0|0)==(31);
     $290 = $I18$0 >>> 1;
     $291 = (25 - ($290))|0;
     $292 = $289 ? 0 : $291;
     $293 = $psize$1 << $292;
     $K19$052 = $293;$T$051 = $284;
     while(1) {
      $300 = $K19$052 >>> 31;
      $301 = (((($T$051)) + 16|0) + ($300<<2)|0);
      $296 = HEAP32[$301>>2]|0;
      $302 = ($296|0)==(0|0);
      if ($302) {
       $$lcssa = $301;$T$051$lcssa = $T$051;
       break;
      }
      $294 = $K19$052 << 1;
      $295 = ((($296)) + 4|0);
      $297 = HEAP32[$295>>2]|0;
      $298 = $297 & -8;
      $299 = ($298|0)==($psize$1|0);
      if ($299) {
       $T$0$lcssa = $296;
       break L202;
      } else {
       $K19$052 = $294;$T$051 = $296;
      }
     }
     $303 = HEAP32[(57144)>>2]|0;
     $304 = ($$lcssa>>>0)<($303>>>0);
     if ($304) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$$lcssa>>2] = $p$0;
      $305 = ((($p$0)) + 24|0);
      HEAP32[$305>>2] = $T$051$lcssa;
      $306 = ((($p$0)) + 12|0);
      HEAP32[$306>>2] = $p$0;
      $307 = ((($p$0)) + 8|0);
      HEAP32[$307>>2] = $p$0;
      break L199;
     }
    }
   } while(0);
   $308 = ((($T$0$lcssa)) + 8|0);
   $309 = HEAP32[$308>>2]|0;
   $310 = HEAP32[(57144)>>2]|0;
   $311 = ($309>>>0)>=($310>>>0);
   $not$ = ($T$0$lcssa>>>0)>=($310>>>0);
   $312 = $311 & $not$;
   if ($312) {
    $313 = ((($309)) + 12|0);
    HEAP32[$313>>2] = $p$0;
    HEAP32[$308>>2] = $p$0;
    $314 = ((($p$0)) + 8|0);
    HEAP32[$314>>2] = $309;
    $315 = ((($p$0)) + 12|0);
    HEAP32[$315>>2] = $T$0$lcssa;
    $316 = ((($p$0)) + 24|0);
    HEAP32[$316>>2] = 0;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $317 = HEAP32[(57160)>>2]|0;
 $318 = (($317) + -1)|0;
 HEAP32[(57160)>>2] = $318;
 $319 = ($318|0)==(0);
 if ($319) {
  $sp$0$in$i = (57584);
 } else {
  return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $320 = ($sp$0$i|0)==(0|0);
  $321 = ((($sp$0$i)) + 8|0);
  if ($320) {
   break;
  } else {
   $sp$0$in$i = $321;
  }
 }
 HEAP32[(57160)>>2] = -1;
 return;
}
function _realloc($oldmem,$bytes) {
 $oldmem = $oldmem|0;
 $bytes = $bytes|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $mem$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($oldmem|0)==(0|0);
 if ($0) {
  $1 = (_malloc($bytes)|0);
  $mem$0 = $1;
  return ($mem$0|0);
 }
 $2 = ($bytes>>>0)>(4294967231);
 if ($2) {
  $3 = (___errno_location()|0);
  HEAP32[$3>>2] = 12;
  $mem$0 = 0;
  return ($mem$0|0);
 }
 $4 = ($bytes>>>0)<(11);
 $5 = (($bytes) + 11)|0;
 $6 = $5 & -8;
 $7 = $4 ? 16 : $6;
 $8 = ((($oldmem)) + -8|0);
 $9 = (_try_realloc_chunk($8,$7)|0);
 $10 = ($9|0)==(0|0);
 if (!($10)) {
  $11 = ((($9)) + 8|0);
  $mem$0 = $11;
  return ($mem$0|0);
 }
 $12 = (_malloc($bytes)|0);
 $13 = ($12|0)==(0|0);
 if ($13) {
  $mem$0 = 0;
  return ($mem$0|0);
 }
 $14 = ((($oldmem)) + -4|0);
 $15 = HEAP32[$14>>2]|0;
 $16 = $15 & -8;
 $17 = $15 & 3;
 $18 = ($17|0)==(0);
 $19 = $18 ? 8 : 4;
 $20 = (($16) - ($19))|0;
 $21 = ($20>>>0)<($bytes>>>0);
 $22 = $21 ? $20 : $bytes;
 _memcpy(($12|0),($oldmem|0),($22|0))|0;
 _free($oldmem);
 $mem$0 = $12;
 return ($mem$0|0);
}
function _try_realloc_chunk($p,$nb) {
 $p = $p|0;
 $nb = $nb|0;
 var $$pre = 0, $$pre$phiZ2D = 0, $$sum = 0, $$sum11 = 0, $$sum12 = 0, $$sum13 = 0, $$sum14 = 0, $$sum15 = 0, $$sum16 = 0, $$sum17 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum22 = 0, $$sum23 = 0, $$sum2728 = 0, $$sum3 = 0, $$sum4 = 0, $$sum5 = 0, $$sum78 = 0;
 var $$sum910 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0;
 var $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0;
 var $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0;
 var $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0;
 var $17 = 0, $170 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0;
 var $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0;
 var $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0;
 var $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0;
 var $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $R$0 = 0, $R$0$lcssa = 0, $R$1 = 0, $RP$0 = 0, $RP$0$lcssa = 0, $cond = 0, $newp$0 = 0, $notlhs = 0;
 var $notrhs = 0, $or$cond$not = 0, $or$cond30 = 0, $storemerge = 0, $storemerge21 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($p)) + 4|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = $1 & -8;
 $3 = (($p) + ($2)|0);
 $4 = HEAP32[(57144)>>2]|0;
 $5 = $1 & 3;
 $notlhs = ($p>>>0)>=($4>>>0);
 $notrhs = ($5|0)!=(1);
 $or$cond$not = $notrhs & $notlhs;
 $6 = ($p>>>0)<($3>>>0);
 $or$cond30 = $or$cond$not & $6;
 if (!($or$cond30)) {
  _abort();
  // unreachable;
 }
 $$sum2728 = $2 | 4;
 $7 = (($p) + ($$sum2728)|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = $8 & 1;
 $10 = ($9|0)==(0);
 if ($10) {
  _abort();
  // unreachable;
 }
 $11 = ($5|0)==(0);
 if ($11) {
  $12 = ($nb>>>0)<(256);
  if ($12) {
   $newp$0 = 0;
   return ($newp$0|0);
  }
  $13 = (($nb) + 4)|0;
  $14 = ($2>>>0)<($13>>>0);
  if (!($14)) {
   $15 = (($2) - ($nb))|0;
   $16 = HEAP32[(57608)>>2]|0;
   $17 = $16 << 1;
   $18 = ($15>>>0)>($17>>>0);
   if (!($18)) {
    $newp$0 = $p;
    return ($newp$0|0);
   }
  }
  $newp$0 = 0;
  return ($newp$0|0);
 }
 $19 = ($2>>>0)<($nb>>>0);
 if (!($19)) {
  $20 = (($2) - ($nb))|0;
  $21 = ($20>>>0)>(15);
  if (!($21)) {
   $newp$0 = $p;
   return ($newp$0|0);
  }
  $22 = (($p) + ($nb)|0);
  $23 = $1 & 1;
  $24 = $23 | $nb;
  $25 = $24 | 2;
  HEAP32[$0>>2] = $25;
  $$sum23 = (($nb) + 4)|0;
  $26 = (($p) + ($$sum23)|0);
  $27 = $20 | 3;
  HEAP32[$26>>2] = $27;
  $28 = HEAP32[$7>>2]|0;
  $29 = $28 | 1;
  HEAP32[$7>>2] = $29;
  _dispose_chunk($22,$20);
  $newp$0 = $p;
  return ($newp$0|0);
 }
 $30 = HEAP32[(57152)>>2]|0;
 $31 = ($3|0)==($30|0);
 if ($31) {
  $32 = HEAP32[(57140)>>2]|0;
  $33 = (($32) + ($2))|0;
  $34 = ($33>>>0)>($nb>>>0);
  if (!($34)) {
   $newp$0 = 0;
   return ($newp$0|0);
  }
  $35 = (($33) - ($nb))|0;
  $36 = (($p) + ($nb)|0);
  $37 = $1 & 1;
  $38 = $37 | $nb;
  $39 = $38 | 2;
  HEAP32[$0>>2] = $39;
  $$sum22 = (($nb) + 4)|0;
  $40 = (($p) + ($$sum22)|0);
  $41 = $35 | 1;
  HEAP32[$40>>2] = $41;
  HEAP32[(57152)>>2] = $36;
  HEAP32[(57140)>>2] = $35;
  $newp$0 = $p;
  return ($newp$0|0);
 }
 $42 = HEAP32[(57148)>>2]|0;
 $43 = ($3|0)==($42|0);
 if ($43) {
  $44 = HEAP32[(57136)>>2]|0;
  $45 = (($44) + ($2))|0;
  $46 = ($45>>>0)<($nb>>>0);
  if ($46) {
   $newp$0 = 0;
   return ($newp$0|0);
  }
  $47 = (($45) - ($nb))|0;
  $48 = ($47>>>0)>(15);
  if ($48) {
   $49 = (($p) + ($nb)|0);
   $50 = (($p) + ($45)|0);
   $51 = $1 & 1;
   $52 = $51 | $nb;
   $53 = $52 | 2;
   HEAP32[$0>>2] = $53;
   $$sum19 = (($nb) + 4)|0;
   $54 = (($p) + ($$sum19)|0);
   $55 = $47 | 1;
   HEAP32[$54>>2] = $55;
   HEAP32[$50>>2] = $47;
   $$sum20 = (($45) + 4)|0;
   $56 = (($p) + ($$sum20)|0);
   $57 = HEAP32[$56>>2]|0;
   $58 = $57 & -2;
   HEAP32[$56>>2] = $58;
   $storemerge = $49;$storemerge21 = $47;
  } else {
   $59 = $1 & 1;
   $60 = $59 | $45;
   $61 = $60 | 2;
   HEAP32[$0>>2] = $61;
   $$sum17 = (($45) + 4)|0;
   $62 = (($p) + ($$sum17)|0);
   $63 = HEAP32[$62>>2]|0;
   $64 = $63 | 1;
   HEAP32[$62>>2] = $64;
   $storemerge = 0;$storemerge21 = 0;
  }
  HEAP32[(57136)>>2] = $storemerge21;
  HEAP32[(57148)>>2] = $storemerge;
  $newp$0 = $p;
  return ($newp$0|0);
 }
 $65 = $8 & 2;
 $66 = ($65|0)==(0);
 if (!($66)) {
  $newp$0 = 0;
  return ($newp$0|0);
 }
 $67 = $8 & -8;
 $68 = (($67) + ($2))|0;
 $69 = ($68>>>0)<($nb>>>0);
 if ($69) {
  $newp$0 = 0;
  return ($newp$0|0);
 }
 $70 = (($68) - ($nb))|0;
 $71 = $8 >>> 3;
 $72 = ($8>>>0)<(256);
 do {
  if ($72) {
   $$sum15 = (($2) + 8)|0;
   $73 = (($p) + ($$sum15)|0);
   $74 = HEAP32[$73>>2]|0;
   $$sum16 = (($2) + 12)|0;
   $75 = (($p) + ($$sum16)|0);
   $76 = HEAP32[$75>>2]|0;
   $77 = $71 << 1;
   $78 = (57168 + ($77<<2)|0);
   $79 = ($74|0)==($78|0);
   if (!($79)) {
    $80 = ($74>>>0)<($4>>>0);
    if ($80) {
     _abort();
     // unreachable;
    }
    $81 = ((($74)) + 12|0);
    $82 = HEAP32[$81>>2]|0;
    $83 = ($82|0)==($3|0);
    if (!($83)) {
     _abort();
     // unreachable;
    }
   }
   $84 = ($76|0)==($74|0);
   if ($84) {
    $85 = 1 << $71;
    $86 = $85 ^ -1;
    $87 = HEAP32[57128>>2]|0;
    $88 = $87 & $86;
    HEAP32[57128>>2] = $88;
    break;
   }
   $89 = ($76|0)==($78|0);
   if ($89) {
    $$pre = ((($76)) + 8|0);
    $$pre$phiZ2D = $$pre;
   } else {
    $90 = ($76>>>0)<($4>>>0);
    if ($90) {
     _abort();
     // unreachable;
    }
    $91 = ((($76)) + 8|0);
    $92 = HEAP32[$91>>2]|0;
    $93 = ($92|0)==($3|0);
    if ($93) {
     $$pre$phiZ2D = $91;
    } else {
     _abort();
     // unreachable;
    }
   }
   $94 = ((($74)) + 12|0);
   HEAP32[$94>>2] = $76;
   HEAP32[$$pre$phiZ2D>>2] = $74;
  } else {
   $$sum = (($2) + 24)|0;
   $95 = (($p) + ($$sum)|0);
   $96 = HEAP32[$95>>2]|0;
   $$sum2 = (($2) + 12)|0;
   $97 = (($p) + ($$sum2)|0);
   $98 = HEAP32[$97>>2]|0;
   $99 = ($98|0)==($3|0);
   do {
    if ($99) {
     $$sum4 = (($2) + 20)|0;
     $109 = (($p) + ($$sum4)|0);
     $110 = HEAP32[$109>>2]|0;
     $111 = ($110|0)==(0|0);
     if ($111) {
      $$sum3 = (($2) + 16)|0;
      $112 = (($p) + ($$sum3)|0);
      $113 = HEAP32[$112>>2]|0;
      $114 = ($113|0)==(0|0);
      if ($114) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $113;$RP$0 = $112;
      }
     } else {
      $R$0 = $110;$RP$0 = $109;
     }
     while(1) {
      $115 = ((($R$0)) + 20|0);
      $116 = HEAP32[$115>>2]|0;
      $117 = ($116|0)==(0|0);
      if (!($117)) {
       $R$0 = $116;$RP$0 = $115;
       continue;
      }
      $118 = ((($R$0)) + 16|0);
      $119 = HEAP32[$118>>2]|0;
      $120 = ($119|0)==(0|0);
      if ($120) {
       $R$0$lcssa = $R$0;$RP$0$lcssa = $RP$0;
       break;
      } else {
       $R$0 = $119;$RP$0 = $118;
      }
     }
     $121 = ($RP$0$lcssa>>>0)<($4>>>0);
     if ($121) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0$lcssa>>2] = 0;
      $R$1 = $R$0$lcssa;
      break;
     }
    } else {
     $$sum14 = (($2) + 8)|0;
     $100 = (($p) + ($$sum14)|0);
     $101 = HEAP32[$100>>2]|0;
     $102 = ($101>>>0)<($4>>>0);
     if ($102) {
      _abort();
      // unreachable;
     }
     $103 = ((($101)) + 12|0);
     $104 = HEAP32[$103>>2]|0;
     $105 = ($104|0)==($3|0);
     if (!($105)) {
      _abort();
      // unreachable;
     }
     $106 = ((($98)) + 8|0);
     $107 = HEAP32[$106>>2]|0;
     $108 = ($107|0)==($3|0);
     if ($108) {
      HEAP32[$103>>2] = $98;
      HEAP32[$106>>2] = $101;
      $R$1 = $98;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $122 = ($96|0)==(0|0);
   if (!($122)) {
    $$sum11 = (($2) + 28)|0;
    $123 = (($p) + ($$sum11)|0);
    $124 = HEAP32[$123>>2]|0;
    $125 = (57432 + ($124<<2)|0);
    $126 = HEAP32[$125>>2]|0;
    $127 = ($3|0)==($126|0);
    if ($127) {
     HEAP32[$125>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $128 = 1 << $124;
      $129 = $128 ^ -1;
      $130 = HEAP32[(57132)>>2]|0;
      $131 = $130 & $129;
      HEAP32[(57132)>>2] = $131;
      break;
     }
    } else {
     $132 = HEAP32[(57144)>>2]|0;
     $133 = ($96>>>0)<($132>>>0);
     if ($133) {
      _abort();
      // unreachable;
     }
     $134 = ((($96)) + 16|0);
     $135 = HEAP32[$134>>2]|0;
     $136 = ($135|0)==($3|0);
     if ($136) {
      HEAP32[$134>>2] = $R$1;
     } else {
      $137 = ((($96)) + 20|0);
      HEAP32[$137>>2] = $R$1;
     }
     $138 = ($R$1|0)==(0|0);
     if ($138) {
      break;
     }
    }
    $139 = HEAP32[(57144)>>2]|0;
    $140 = ($R$1>>>0)<($139>>>0);
    if ($140) {
     _abort();
     // unreachable;
    }
    $141 = ((($R$1)) + 24|0);
    HEAP32[$141>>2] = $96;
    $$sum12 = (($2) + 16)|0;
    $142 = (($p) + ($$sum12)|0);
    $143 = HEAP32[$142>>2]|0;
    $144 = ($143|0)==(0|0);
    do {
     if (!($144)) {
      $145 = ($143>>>0)<($139>>>0);
      if ($145) {
       _abort();
       // unreachable;
      } else {
       $146 = ((($R$1)) + 16|0);
       HEAP32[$146>>2] = $143;
       $147 = ((($143)) + 24|0);
       HEAP32[$147>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum13 = (($2) + 20)|0;
    $148 = (($p) + ($$sum13)|0);
    $149 = HEAP32[$148>>2]|0;
    $150 = ($149|0)==(0|0);
    if (!($150)) {
     $151 = HEAP32[(57144)>>2]|0;
     $152 = ($149>>>0)<($151>>>0);
     if ($152) {
      _abort();
      // unreachable;
     } else {
      $153 = ((($R$1)) + 20|0);
      HEAP32[$153>>2] = $149;
      $154 = ((($149)) + 24|0);
      HEAP32[$154>>2] = $R$1;
      break;
     }
    }
   }
  }
 } while(0);
 $155 = ($70>>>0)<(16);
 if ($155) {
  $156 = $1 & 1;
  $157 = $68 | $156;
  $158 = $157 | 2;
  HEAP32[$0>>2] = $158;
  $$sum910 = $68 | 4;
  $159 = (($p) + ($$sum910)|0);
  $160 = HEAP32[$159>>2]|0;
  $161 = $160 | 1;
  HEAP32[$159>>2] = $161;
  $newp$0 = $p;
  return ($newp$0|0);
 } else {
  $162 = (($p) + ($nb)|0);
  $163 = $1 & 1;
  $164 = $163 | $nb;
  $165 = $164 | 2;
  HEAP32[$0>>2] = $165;
  $$sum5 = (($nb) + 4)|0;
  $166 = (($p) + ($$sum5)|0);
  $167 = $70 | 3;
  HEAP32[$166>>2] = $167;
  $$sum78 = $68 | 4;
  $168 = (($p) + ($$sum78)|0);
  $169 = HEAP32[$168>>2]|0;
  $170 = $169 | 1;
  HEAP32[$168>>2] = $170;
  _dispose_chunk($162,$70);
  $newp$0 = $p;
  return ($newp$0|0);
 }
 return (0)|0;
}
function _dispose_chunk($p,$psize) {
 $p = $p|0;
 $psize = $psize|0;
 var $$0 = 0, $$02 = 0, $$1 = 0, $$lcssa = 0, $$pre = 0, $$pre$phi50Z2D = 0, $$pre$phi52Z2D = 0, $$pre$phiZ2D = 0, $$pre48 = 0, $$pre49 = 0, $$pre51 = 0, $$sum = 0, $$sum1 = 0, $$sum10 = 0, $$sum11 = 0, $$sum12 = 0, $$sum13 = 0, $$sum14 = 0, $$sum16 = 0, $$sum17 = 0;
 var $$sum18 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum21 = 0, $$sum22 = 0, $$sum23 = 0, $$sum24 = 0, $$sum25 = 0, $$sum3 = 0, $$sum4 = 0, $$sum5 = 0, $$sum7 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0;
 var $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0;
 var $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0;
 var $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0;
 var $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0;
 var $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0;
 var $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0;
 var $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0;
 var $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0;
 var $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0;
 var $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0;
 var $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0;
 var $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0;
 var $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0;
 var $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I19$0 = 0, $K20$043 = 0, $R$0 = 0, $R$0$lcssa = 0, $R$1 = 0, $R7$0 = 0, $R7$0$lcssa = 0, $R7$1 = 0, $RP$0 = 0, $RP$0$lcssa = 0, $RP9$0 = 0, $RP9$0$lcssa = 0, $T$0$lcssa = 0, $T$042 = 0, $T$042$lcssa = 0, $cond = 0;
 var $cond39 = 0, $not$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($p) + ($psize)|0);
 $1 = ((($p)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = $2 & 1;
 $4 = ($3|0)==(0);
 do {
  if ($4) {
   $5 = HEAP32[$p>>2]|0;
   $6 = $2 & 3;
   $7 = ($6|0)==(0);
   if ($7) {
    return;
   }
   $8 = (0 - ($5))|0;
   $9 = (($p) + ($8)|0);
   $10 = (($5) + ($psize))|0;
   $11 = HEAP32[(57144)>>2]|0;
   $12 = ($9>>>0)<($11>>>0);
   if ($12) {
    _abort();
    // unreachable;
   }
   $13 = HEAP32[(57148)>>2]|0;
   $14 = ($9|0)==($13|0);
   if ($14) {
    $$sum = (($psize) + 4)|0;
    $99 = (($p) + ($$sum)|0);
    $100 = HEAP32[$99>>2]|0;
    $101 = $100 & 3;
    $102 = ($101|0)==(3);
    if (!($102)) {
     $$0 = $9;$$02 = $10;
     break;
    }
    HEAP32[(57136)>>2] = $10;
    $103 = $100 & -2;
    HEAP32[$99>>2] = $103;
    $104 = $10 | 1;
    $$sum14 = (4 - ($5))|0;
    $105 = (($p) + ($$sum14)|0);
    HEAP32[$105>>2] = $104;
    HEAP32[$0>>2] = $10;
    return;
   }
   $15 = $5 >>> 3;
   $16 = ($5>>>0)<(256);
   if ($16) {
    $$sum24 = (8 - ($5))|0;
    $17 = (($p) + ($$sum24)|0);
    $18 = HEAP32[$17>>2]|0;
    $$sum25 = (12 - ($5))|0;
    $19 = (($p) + ($$sum25)|0);
    $20 = HEAP32[$19>>2]|0;
    $21 = $15 << 1;
    $22 = (57168 + ($21<<2)|0);
    $23 = ($18|0)==($22|0);
    if (!($23)) {
     $24 = ($18>>>0)<($11>>>0);
     if ($24) {
      _abort();
      // unreachable;
     }
     $25 = ((($18)) + 12|0);
     $26 = HEAP32[$25>>2]|0;
     $27 = ($26|0)==($9|0);
     if (!($27)) {
      _abort();
      // unreachable;
     }
    }
    $28 = ($20|0)==($18|0);
    if ($28) {
     $29 = 1 << $15;
     $30 = $29 ^ -1;
     $31 = HEAP32[57128>>2]|0;
     $32 = $31 & $30;
     HEAP32[57128>>2] = $32;
     $$0 = $9;$$02 = $10;
     break;
    }
    $33 = ($20|0)==($22|0);
    if ($33) {
     $$pre51 = ((($20)) + 8|0);
     $$pre$phi52Z2D = $$pre51;
    } else {
     $34 = ($20>>>0)<($11>>>0);
     if ($34) {
      _abort();
      // unreachable;
     }
     $35 = ((($20)) + 8|0);
     $36 = HEAP32[$35>>2]|0;
     $37 = ($36|0)==($9|0);
     if ($37) {
      $$pre$phi52Z2D = $35;
     } else {
      _abort();
      // unreachable;
     }
    }
    $38 = ((($18)) + 12|0);
    HEAP32[$38>>2] = $20;
    HEAP32[$$pre$phi52Z2D>>2] = $18;
    $$0 = $9;$$02 = $10;
    break;
   }
   $$sum16 = (24 - ($5))|0;
   $39 = (($p) + ($$sum16)|0);
   $40 = HEAP32[$39>>2]|0;
   $$sum17 = (12 - ($5))|0;
   $41 = (($p) + ($$sum17)|0);
   $42 = HEAP32[$41>>2]|0;
   $43 = ($42|0)==($9|0);
   do {
    if ($43) {
     $$sum18 = (16 - ($5))|0;
     $$sum19 = (($$sum18) + 4)|0;
     $53 = (($p) + ($$sum19)|0);
     $54 = HEAP32[$53>>2]|0;
     $55 = ($54|0)==(0|0);
     if ($55) {
      $56 = (($p) + ($$sum18)|0);
      $57 = HEAP32[$56>>2]|0;
      $58 = ($57|0)==(0|0);
      if ($58) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $57;$RP$0 = $56;
      }
     } else {
      $R$0 = $54;$RP$0 = $53;
     }
     while(1) {
      $59 = ((($R$0)) + 20|0);
      $60 = HEAP32[$59>>2]|0;
      $61 = ($60|0)==(0|0);
      if (!($61)) {
       $R$0 = $60;$RP$0 = $59;
       continue;
      }
      $62 = ((($R$0)) + 16|0);
      $63 = HEAP32[$62>>2]|0;
      $64 = ($63|0)==(0|0);
      if ($64) {
       $R$0$lcssa = $R$0;$RP$0$lcssa = $RP$0;
       break;
      } else {
       $R$0 = $63;$RP$0 = $62;
      }
     }
     $65 = ($RP$0$lcssa>>>0)<($11>>>0);
     if ($65) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0$lcssa>>2] = 0;
      $R$1 = $R$0$lcssa;
      break;
     }
    } else {
     $$sum23 = (8 - ($5))|0;
     $44 = (($p) + ($$sum23)|0);
     $45 = HEAP32[$44>>2]|0;
     $46 = ($45>>>0)<($11>>>0);
     if ($46) {
      _abort();
      // unreachable;
     }
     $47 = ((($45)) + 12|0);
     $48 = HEAP32[$47>>2]|0;
     $49 = ($48|0)==($9|0);
     if (!($49)) {
      _abort();
      // unreachable;
     }
     $50 = ((($42)) + 8|0);
     $51 = HEAP32[$50>>2]|0;
     $52 = ($51|0)==($9|0);
     if ($52) {
      HEAP32[$47>>2] = $42;
      HEAP32[$50>>2] = $45;
      $R$1 = $42;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $66 = ($40|0)==(0|0);
   if ($66) {
    $$0 = $9;$$02 = $10;
   } else {
    $$sum20 = (28 - ($5))|0;
    $67 = (($p) + ($$sum20)|0);
    $68 = HEAP32[$67>>2]|0;
    $69 = (57432 + ($68<<2)|0);
    $70 = HEAP32[$69>>2]|0;
    $71 = ($9|0)==($70|0);
    if ($71) {
     HEAP32[$69>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $72 = 1 << $68;
      $73 = $72 ^ -1;
      $74 = HEAP32[(57132)>>2]|0;
      $75 = $74 & $73;
      HEAP32[(57132)>>2] = $75;
      $$0 = $9;$$02 = $10;
      break;
     }
    } else {
     $76 = HEAP32[(57144)>>2]|0;
     $77 = ($40>>>0)<($76>>>0);
     if ($77) {
      _abort();
      // unreachable;
     }
     $78 = ((($40)) + 16|0);
     $79 = HEAP32[$78>>2]|0;
     $80 = ($79|0)==($9|0);
     if ($80) {
      HEAP32[$78>>2] = $R$1;
     } else {
      $81 = ((($40)) + 20|0);
      HEAP32[$81>>2] = $R$1;
     }
     $82 = ($R$1|0)==(0|0);
     if ($82) {
      $$0 = $9;$$02 = $10;
      break;
     }
    }
    $83 = HEAP32[(57144)>>2]|0;
    $84 = ($R$1>>>0)<($83>>>0);
    if ($84) {
     _abort();
     // unreachable;
    }
    $85 = ((($R$1)) + 24|0);
    HEAP32[$85>>2] = $40;
    $$sum21 = (16 - ($5))|0;
    $86 = (($p) + ($$sum21)|0);
    $87 = HEAP32[$86>>2]|0;
    $88 = ($87|0)==(0|0);
    do {
     if (!($88)) {
      $89 = ($87>>>0)<($83>>>0);
      if ($89) {
       _abort();
       // unreachable;
      } else {
       $90 = ((($R$1)) + 16|0);
       HEAP32[$90>>2] = $87;
       $91 = ((($87)) + 24|0);
       HEAP32[$91>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum22 = (($$sum21) + 4)|0;
    $92 = (($p) + ($$sum22)|0);
    $93 = HEAP32[$92>>2]|0;
    $94 = ($93|0)==(0|0);
    if ($94) {
     $$0 = $9;$$02 = $10;
    } else {
     $95 = HEAP32[(57144)>>2]|0;
     $96 = ($93>>>0)<($95>>>0);
     if ($96) {
      _abort();
      // unreachable;
     } else {
      $97 = ((($R$1)) + 20|0);
      HEAP32[$97>>2] = $93;
      $98 = ((($93)) + 24|0);
      HEAP32[$98>>2] = $R$1;
      $$0 = $9;$$02 = $10;
      break;
     }
    }
   }
  } else {
   $$0 = $p;$$02 = $psize;
  }
 } while(0);
 $106 = HEAP32[(57144)>>2]|0;
 $107 = ($0>>>0)<($106>>>0);
 if ($107) {
  _abort();
  // unreachable;
 }
 $$sum1 = (($psize) + 4)|0;
 $108 = (($p) + ($$sum1)|0);
 $109 = HEAP32[$108>>2]|0;
 $110 = $109 & 2;
 $111 = ($110|0)==(0);
 if ($111) {
  $112 = HEAP32[(57152)>>2]|0;
  $113 = ($0|0)==($112|0);
  if ($113) {
   $114 = HEAP32[(57140)>>2]|0;
   $115 = (($114) + ($$02))|0;
   HEAP32[(57140)>>2] = $115;
   HEAP32[(57152)>>2] = $$0;
   $116 = $115 | 1;
   $117 = ((($$0)) + 4|0);
   HEAP32[$117>>2] = $116;
   $118 = HEAP32[(57148)>>2]|0;
   $119 = ($$0|0)==($118|0);
   if (!($119)) {
    return;
   }
   HEAP32[(57148)>>2] = 0;
   HEAP32[(57136)>>2] = 0;
   return;
  }
  $120 = HEAP32[(57148)>>2]|0;
  $121 = ($0|0)==($120|0);
  if ($121) {
   $122 = HEAP32[(57136)>>2]|0;
   $123 = (($122) + ($$02))|0;
   HEAP32[(57136)>>2] = $123;
   HEAP32[(57148)>>2] = $$0;
   $124 = $123 | 1;
   $125 = ((($$0)) + 4|0);
   HEAP32[$125>>2] = $124;
   $126 = (($$0) + ($123)|0);
   HEAP32[$126>>2] = $123;
   return;
  }
  $127 = $109 & -8;
  $128 = (($127) + ($$02))|0;
  $129 = $109 >>> 3;
  $130 = ($109>>>0)<(256);
  do {
   if ($130) {
    $$sum12 = (($psize) + 8)|0;
    $131 = (($p) + ($$sum12)|0);
    $132 = HEAP32[$131>>2]|0;
    $$sum13 = (($psize) + 12)|0;
    $133 = (($p) + ($$sum13)|0);
    $134 = HEAP32[$133>>2]|0;
    $135 = $129 << 1;
    $136 = (57168 + ($135<<2)|0);
    $137 = ($132|0)==($136|0);
    if (!($137)) {
     $138 = ($132>>>0)<($106>>>0);
     if ($138) {
      _abort();
      // unreachable;
     }
     $139 = ((($132)) + 12|0);
     $140 = HEAP32[$139>>2]|0;
     $141 = ($140|0)==($0|0);
     if (!($141)) {
      _abort();
      // unreachable;
     }
    }
    $142 = ($134|0)==($132|0);
    if ($142) {
     $143 = 1 << $129;
     $144 = $143 ^ -1;
     $145 = HEAP32[57128>>2]|0;
     $146 = $145 & $144;
     HEAP32[57128>>2] = $146;
     break;
    }
    $147 = ($134|0)==($136|0);
    if ($147) {
     $$pre49 = ((($134)) + 8|0);
     $$pre$phi50Z2D = $$pre49;
    } else {
     $148 = ($134>>>0)<($106>>>0);
     if ($148) {
      _abort();
      // unreachable;
     }
     $149 = ((($134)) + 8|0);
     $150 = HEAP32[$149>>2]|0;
     $151 = ($150|0)==($0|0);
     if ($151) {
      $$pre$phi50Z2D = $149;
     } else {
      _abort();
      // unreachable;
     }
    }
    $152 = ((($132)) + 12|0);
    HEAP32[$152>>2] = $134;
    HEAP32[$$pre$phi50Z2D>>2] = $132;
   } else {
    $$sum2 = (($psize) + 24)|0;
    $153 = (($p) + ($$sum2)|0);
    $154 = HEAP32[$153>>2]|0;
    $$sum3 = (($psize) + 12)|0;
    $155 = (($p) + ($$sum3)|0);
    $156 = HEAP32[$155>>2]|0;
    $157 = ($156|0)==($0|0);
    do {
     if ($157) {
      $$sum5 = (($psize) + 20)|0;
      $167 = (($p) + ($$sum5)|0);
      $168 = HEAP32[$167>>2]|0;
      $169 = ($168|0)==(0|0);
      if ($169) {
       $$sum4 = (($psize) + 16)|0;
       $170 = (($p) + ($$sum4)|0);
       $171 = HEAP32[$170>>2]|0;
       $172 = ($171|0)==(0|0);
       if ($172) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $171;$RP9$0 = $170;
       }
      } else {
       $R7$0 = $168;$RP9$0 = $167;
      }
      while(1) {
       $173 = ((($R7$0)) + 20|0);
       $174 = HEAP32[$173>>2]|0;
       $175 = ($174|0)==(0|0);
       if (!($175)) {
        $R7$0 = $174;$RP9$0 = $173;
        continue;
       }
       $176 = ((($R7$0)) + 16|0);
       $177 = HEAP32[$176>>2]|0;
       $178 = ($177|0)==(0|0);
       if ($178) {
        $R7$0$lcssa = $R7$0;$RP9$0$lcssa = $RP9$0;
        break;
       } else {
        $R7$0 = $177;$RP9$0 = $176;
       }
      }
      $179 = ($RP9$0$lcssa>>>0)<($106>>>0);
      if ($179) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0$lcssa>>2] = 0;
       $R7$1 = $R7$0$lcssa;
       break;
      }
     } else {
      $$sum11 = (($psize) + 8)|0;
      $158 = (($p) + ($$sum11)|0);
      $159 = HEAP32[$158>>2]|0;
      $160 = ($159>>>0)<($106>>>0);
      if ($160) {
       _abort();
       // unreachable;
      }
      $161 = ((($159)) + 12|0);
      $162 = HEAP32[$161>>2]|0;
      $163 = ($162|0)==($0|0);
      if (!($163)) {
       _abort();
       // unreachable;
      }
      $164 = ((($156)) + 8|0);
      $165 = HEAP32[$164>>2]|0;
      $166 = ($165|0)==($0|0);
      if ($166) {
       HEAP32[$161>>2] = $156;
       HEAP32[$164>>2] = $159;
       $R7$1 = $156;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $180 = ($154|0)==(0|0);
    if (!($180)) {
     $$sum8 = (($psize) + 28)|0;
     $181 = (($p) + ($$sum8)|0);
     $182 = HEAP32[$181>>2]|0;
     $183 = (57432 + ($182<<2)|0);
     $184 = HEAP32[$183>>2]|0;
     $185 = ($0|0)==($184|0);
     if ($185) {
      HEAP32[$183>>2] = $R7$1;
      $cond39 = ($R7$1|0)==(0|0);
      if ($cond39) {
       $186 = 1 << $182;
       $187 = $186 ^ -1;
       $188 = HEAP32[(57132)>>2]|0;
       $189 = $188 & $187;
       HEAP32[(57132)>>2] = $189;
       break;
      }
     } else {
      $190 = HEAP32[(57144)>>2]|0;
      $191 = ($154>>>0)<($190>>>0);
      if ($191) {
       _abort();
       // unreachable;
      }
      $192 = ((($154)) + 16|0);
      $193 = HEAP32[$192>>2]|0;
      $194 = ($193|0)==($0|0);
      if ($194) {
       HEAP32[$192>>2] = $R7$1;
      } else {
       $195 = ((($154)) + 20|0);
       HEAP32[$195>>2] = $R7$1;
      }
      $196 = ($R7$1|0)==(0|0);
      if ($196) {
       break;
      }
     }
     $197 = HEAP32[(57144)>>2]|0;
     $198 = ($R7$1>>>0)<($197>>>0);
     if ($198) {
      _abort();
      // unreachable;
     }
     $199 = ((($R7$1)) + 24|0);
     HEAP32[$199>>2] = $154;
     $$sum9 = (($psize) + 16)|0;
     $200 = (($p) + ($$sum9)|0);
     $201 = HEAP32[$200>>2]|0;
     $202 = ($201|0)==(0|0);
     do {
      if (!($202)) {
       $203 = ($201>>>0)<($197>>>0);
       if ($203) {
        _abort();
        // unreachable;
       } else {
        $204 = ((($R7$1)) + 16|0);
        HEAP32[$204>>2] = $201;
        $205 = ((($201)) + 24|0);
        HEAP32[$205>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum10 = (($psize) + 20)|0;
     $206 = (($p) + ($$sum10)|0);
     $207 = HEAP32[$206>>2]|0;
     $208 = ($207|0)==(0|0);
     if (!($208)) {
      $209 = HEAP32[(57144)>>2]|0;
      $210 = ($207>>>0)<($209>>>0);
      if ($210) {
       _abort();
       // unreachable;
      } else {
       $211 = ((($R7$1)) + 20|0);
       HEAP32[$211>>2] = $207;
       $212 = ((($207)) + 24|0);
       HEAP32[$212>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $213 = $128 | 1;
  $214 = ((($$0)) + 4|0);
  HEAP32[$214>>2] = $213;
  $215 = (($$0) + ($128)|0);
  HEAP32[$215>>2] = $128;
  $216 = HEAP32[(57148)>>2]|0;
  $217 = ($$0|0)==($216|0);
  if ($217) {
   HEAP32[(57136)>>2] = $128;
   return;
  } else {
   $$1 = $128;
  }
 } else {
  $218 = $109 & -2;
  HEAP32[$108>>2] = $218;
  $219 = $$02 | 1;
  $220 = ((($$0)) + 4|0);
  HEAP32[$220>>2] = $219;
  $221 = (($$0) + ($$02)|0);
  HEAP32[$221>>2] = $$02;
  $$1 = $$02;
 }
 $222 = $$1 >>> 3;
 $223 = ($$1>>>0)<(256);
 if ($223) {
  $224 = $222 << 1;
  $225 = (57168 + ($224<<2)|0);
  $226 = HEAP32[57128>>2]|0;
  $227 = 1 << $222;
  $228 = $226 & $227;
  $229 = ($228|0)==(0);
  if ($229) {
   $230 = $226 | $227;
   HEAP32[57128>>2] = $230;
   $$pre = (($224) + 2)|0;
   $$pre48 = (57168 + ($$pre<<2)|0);
   $$pre$phiZ2D = $$pre48;$F16$0 = $225;
  } else {
   $$sum7 = (($224) + 2)|0;
   $231 = (57168 + ($$sum7<<2)|0);
   $232 = HEAP32[$231>>2]|0;
   $233 = HEAP32[(57144)>>2]|0;
   $234 = ($232>>>0)<($233>>>0);
   if ($234) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $231;$F16$0 = $232;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $$0;
  $235 = ((($F16$0)) + 12|0);
  HEAP32[$235>>2] = $$0;
  $236 = ((($$0)) + 8|0);
  HEAP32[$236>>2] = $F16$0;
  $237 = ((($$0)) + 12|0);
  HEAP32[$237>>2] = $225;
  return;
 }
 $238 = $$1 >>> 8;
 $239 = ($238|0)==(0);
 if ($239) {
  $I19$0 = 0;
 } else {
  $240 = ($$1>>>0)>(16777215);
  if ($240) {
   $I19$0 = 31;
  } else {
   $241 = (($238) + 1048320)|0;
   $242 = $241 >>> 16;
   $243 = $242 & 8;
   $244 = $238 << $243;
   $245 = (($244) + 520192)|0;
   $246 = $245 >>> 16;
   $247 = $246 & 4;
   $248 = $247 | $243;
   $249 = $244 << $247;
   $250 = (($249) + 245760)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 2;
   $253 = $248 | $252;
   $254 = (14 - ($253))|0;
   $255 = $249 << $252;
   $256 = $255 >>> 15;
   $257 = (($254) + ($256))|0;
   $258 = $257 << 1;
   $259 = (($257) + 7)|0;
   $260 = $$1 >>> $259;
   $261 = $260 & 1;
   $262 = $261 | $258;
   $I19$0 = $262;
  }
 }
 $263 = (57432 + ($I19$0<<2)|0);
 $264 = ((($$0)) + 28|0);
 HEAP32[$264>>2] = $I19$0;
 $265 = ((($$0)) + 16|0);
 $266 = ((($$0)) + 20|0);
 HEAP32[$266>>2] = 0;
 HEAP32[$265>>2] = 0;
 $267 = HEAP32[(57132)>>2]|0;
 $268 = 1 << $I19$0;
 $269 = $267 & $268;
 $270 = ($269|0)==(0);
 if ($270) {
  $271 = $267 | $268;
  HEAP32[(57132)>>2] = $271;
  HEAP32[$263>>2] = $$0;
  $272 = ((($$0)) + 24|0);
  HEAP32[$272>>2] = $263;
  $273 = ((($$0)) + 12|0);
  HEAP32[$273>>2] = $$0;
  $274 = ((($$0)) + 8|0);
  HEAP32[$274>>2] = $$0;
  return;
 }
 $275 = HEAP32[$263>>2]|0;
 $276 = ((($275)) + 4|0);
 $277 = HEAP32[$276>>2]|0;
 $278 = $277 & -8;
 $279 = ($278|0)==($$1|0);
 L191: do {
  if ($279) {
   $T$0$lcssa = $275;
  } else {
   $280 = ($I19$0|0)==(31);
   $281 = $I19$0 >>> 1;
   $282 = (25 - ($281))|0;
   $283 = $280 ? 0 : $282;
   $284 = $$1 << $283;
   $K20$043 = $284;$T$042 = $275;
   while(1) {
    $291 = $K20$043 >>> 31;
    $292 = (((($T$042)) + 16|0) + ($291<<2)|0);
    $287 = HEAP32[$292>>2]|0;
    $293 = ($287|0)==(0|0);
    if ($293) {
     $$lcssa = $292;$T$042$lcssa = $T$042;
     break;
    }
    $285 = $K20$043 << 1;
    $286 = ((($287)) + 4|0);
    $288 = HEAP32[$286>>2]|0;
    $289 = $288 & -8;
    $290 = ($289|0)==($$1|0);
    if ($290) {
     $T$0$lcssa = $287;
     break L191;
    } else {
     $K20$043 = $285;$T$042 = $287;
    }
   }
   $294 = HEAP32[(57144)>>2]|0;
   $295 = ($$lcssa>>>0)<($294>>>0);
   if ($295) {
    _abort();
    // unreachable;
   }
   HEAP32[$$lcssa>>2] = $$0;
   $296 = ((($$0)) + 24|0);
   HEAP32[$296>>2] = $T$042$lcssa;
   $297 = ((($$0)) + 12|0);
   HEAP32[$297>>2] = $$0;
   $298 = ((($$0)) + 8|0);
   HEAP32[$298>>2] = $$0;
   return;
  }
 } while(0);
 $299 = ((($T$0$lcssa)) + 8|0);
 $300 = HEAP32[$299>>2]|0;
 $301 = HEAP32[(57144)>>2]|0;
 $302 = ($300>>>0)>=($301>>>0);
 $not$ = ($T$0$lcssa>>>0)>=($301>>>0);
 $303 = $302 & $not$;
 if (!($303)) {
  _abort();
  // unreachable;
 }
 $304 = ((($300)) + 12|0);
 HEAP32[$304>>2] = $$0;
 HEAP32[$299>>2] = $$0;
 $305 = ((($$0)) + 8|0);
 HEAP32[$305>>2] = $300;
 $306 = ((($$0)) + 12|0);
 HEAP32[$306>>2] = $T$0$lcssa;
 $307 = ((($$0)) + 24|0);
 HEAP32[$307>>2] = 0;
 return;
}
function runPostSets() {
}
function _i64Subtract(a, b, c, d) {
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a - c)>>>0;
    h = (b - d)>>>0;
    h = (b - d - (((c>>>0) > (a>>>0))|0))>>>0; // Borrow one from high word to low word on underflow.
    return ((tempRet0 = h,l|0)|0);
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _bitshift64Shl(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = (high << bits) | ((low&(ander << (32 - bits))) >>> (32 - bits));
      return low << bits;
    }
    tempRet0 = low << (bits - 32);
    return 0;
}
function _i64Add(a, b, c, d) {
    /*
      x = a + b*2^32
      y = c + d*2^32
      result = l + h*2^32
    */
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a + c)>>>0;
    h = (b + d + (((l>>>0) < (a>>>0))|0))>>>0; // Add carry from low word to high word on overflow.
    return ((tempRet0 = h,l|0)|0);
}
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
}
function _memcpy(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}
function _bitshift64Ashr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = (high|0) < 0 ? -1 : 0;
    return (high >> (bits - 32))|0;
  }
function _llvm_cttz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((cttz_i8)+(x & 0xff))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((cttz_i8)+(x >>> 24))>>0)])|0) + 24)|0;
  }

// ======== compiled code from system/lib/compiler-rt , see readme therein
function ___muldsi3($a, $b) {
  $a = $a | 0;
  $b = $b | 0;
  var $1 = 0, $2 = 0, $3 = 0, $6 = 0, $8 = 0, $11 = 0, $12 = 0;
  $1 = $a & 65535;
  $2 = $b & 65535;
  $3 = Math_imul($2, $1) | 0;
  $6 = $a >>> 16;
  $8 = ($3 >>> 16) + (Math_imul($2, $6) | 0) | 0;
  $11 = $b >>> 16;
  $12 = Math_imul($11, $1) | 0;
  return (tempRet0 = (($8 >>> 16) + (Math_imul($11, $6) | 0) | 0) + ((($8 & 65535) + $12 | 0) >>> 16) | 0, 0 | ($8 + $12 << 16 | $3 & 65535)) | 0;
}
function ___divdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $7$0 = 0, $7$1 = 0, $8$0 = 0, $10$0 = 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  $7$0 = $2$0 ^ $1$0;
  $7$1 = $2$1 ^ $1$1;
  $8$0 = ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, 0) | 0;
  $10$0 = _i64Subtract($8$0 ^ $7$0, tempRet0 ^ $7$1, $7$0, $7$1) | 0;
  return $10$0 | 0;
}
function ___remdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $10$0 = 0, $10$1 = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 16 | 0;
  $rem = __stackBase__ | 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, $rem) | 0;
  $10$0 = _i64Subtract(HEAP32[$rem >> 2] ^ $1$0, HEAP32[$rem + 4 >> 2] ^ $1$1, $1$0, $1$1) | 0;
  $10$1 = tempRet0;
  STACKTOP = __stackBase__;
  return (tempRet0 = $10$1, $10$0) | 0;
}
function ___muldi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $x_sroa_0_0_extract_trunc = 0, $y_sroa_0_0_extract_trunc = 0, $1$0 = 0, $1$1 = 0, $2 = 0;
  $x_sroa_0_0_extract_trunc = $a$0;
  $y_sroa_0_0_extract_trunc = $b$0;
  $1$0 = ___muldsi3($x_sroa_0_0_extract_trunc, $y_sroa_0_0_extract_trunc) | 0;
  $1$1 = tempRet0;
  $2 = Math_imul($a$1, $y_sroa_0_0_extract_trunc) | 0;
  return (tempRet0 = ((Math_imul($b$1, $x_sroa_0_0_extract_trunc) | 0) + $2 | 0) + $1$1 | $1$1 & 0, 0 | $1$0 & -1) | 0;
}
function ___udivdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0;
  $1$0 = ___udivmoddi4($a$0, $a$1, $b$0, $b$1, 0) | 0;
  return $1$0 | 0;
}
function ___uremdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 16 | 0;
  $rem = __stackBase__ | 0;
  ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) | 0;
  STACKTOP = __stackBase__;
  return (tempRet0 = HEAP32[$rem + 4 >> 2] | 0, HEAP32[$rem >> 2] | 0) | 0;
}
function ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  $rem = $rem | 0;
  var $n_sroa_0_0_extract_trunc = 0, $n_sroa_1_4_extract_shift$0 = 0, $n_sroa_1_4_extract_trunc = 0, $d_sroa_0_0_extract_trunc = 0, $d_sroa_1_4_extract_shift$0 = 0, $d_sroa_1_4_extract_trunc = 0, $4 = 0, $17 = 0, $37 = 0, $49 = 0, $51 = 0, $57 = 0, $58 = 0, $66 = 0, $78 = 0, $86 = 0, $88 = 0, $89 = 0, $91 = 0, $92 = 0, $95 = 0, $105 = 0, $117 = 0, $119 = 0, $125 = 0, $126 = 0, $130 = 0, $q_sroa_1_1_ph = 0, $q_sroa_0_1_ph = 0, $r_sroa_1_1_ph = 0, $r_sroa_0_1_ph = 0, $sr_1_ph = 0, $d_sroa_0_0_insert_insert99$0 = 0, $d_sroa_0_0_insert_insert99$1 = 0, $137$0 = 0, $137$1 = 0, $carry_0203 = 0, $sr_1202 = 0, $r_sroa_0_1201 = 0, $r_sroa_1_1200 = 0, $q_sroa_0_1199 = 0, $q_sroa_1_1198 = 0, $147 = 0, $149 = 0, $r_sroa_0_0_insert_insert42$0 = 0, $r_sroa_0_0_insert_insert42$1 = 0, $150$1 = 0, $151$0 = 0, $152 = 0, $154$0 = 0, $r_sroa_0_0_extract_trunc = 0, $r_sroa_1_4_extract_trunc = 0, $155 = 0, $carry_0_lcssa$0 = 0, $carry_0_lcssa$1 = 0, $r_sroa_0_1_lcssa = 0, $r_sroa_1_1_lcssa = 0, $q_sroa_0_1_lcssa = 0, $q_sroa_1_1_lcssa = 0, $q_sroa_0_0_insert_ext75$0 = 0, $q_sroa_0_0_insert_ext75$1 = 0, $q_sroa_0_0_insert_insert77$1 = 0, $_0$0 = 0, $_0$1 = 0;
  $n_sroa_0_0_extract_trunc = $a$0;
  $n_sroa_1_4_extract_shift$0 = $a$1;
  $n_sroa_1_4_extract_trunc = $n_sroa_1_4_extract_shift$0;
  $d_sroa_0_0_extract_trunc = $b$0;
  $d_sroa_1_4_extract_shift$0 = $b$1;
  $d_sroa_1_4_extract_trunc = $d_sroa_1_4_extract_shift$0;
  if (($n_sroa_1_4_extract_trunc | 0) == 0) {
    $4 = ($rem | 0) != 0;
    if (($d_sroa_1_4_extract_trunc | 0) == 0) {
      if ($4) {
        HEAP32[$rem >> 2] = ($n_sroa_0_0_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
        HEAP32[$rem + 4 >> 2] = 0;
      }
      $_0$1 = 0;
      $_0$0 = ($n_sroa_0_0_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$4) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    }
  }
  $17 = ($d_sroa_1_4_extract_trunc | 0) == 0;
  do {
    if (($d_sroa_0_0_extract_trunc | 0) == 0) {
      if ($17) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
          HEAP32[$rem + 4 >> 2] = 0;
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      if (($n_sroa_0_0_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0;
          HEAP32[$rem + 4 >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_1_4_extract_trunc >>> 0);
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_1_4_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $37 = $d_sroa_1_4_extract_trunc - 1 | 0;
      if (($37 & $d_sroa_1_4_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0 | $a$0 & -1;
          HEAP32[$rem + 4 >> 2] = $37 & $n_sroa_1_4_extract_trunc | $a$1 & 0;
        }
        $_0$1 = 0;
        $_0$0 = $n_sroa_1_4_extract_trunc >>> ((_llvm_cttz_i32($d_sroa_1_4_extract_trunc | 0) | 0) >>> 0);
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $49 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
      $51 = $49 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
      if ($51 >>> 0 <= 30) {
        $57 = $51 + 1 | 0;
        $58 = 31 - $51 | 0;
        $sr_1_ph = $57;
        $r_sroa_0_1_ph = $n_sroa_1_4_extract_trunc << $58 | $n_sroa_0_0_extract_trunc >>> ($57 >>> 0);
        $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($57 >>> 0);
        $q_sroa_0_1_ph = 0;
        $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $58;
        break;
      }
      if (($rem | 0) == 0) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = 0 | $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$17) {
        $117 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
        $119 = $117 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        if ($119 >>> 0 <= 31) {
          $125 = $119 + 1 | 0;
          $126 = 31 - $119 | 0;
          $130 = $119 - 31 >> 31;
          $sr_1_ph = $125;
          $r_sroa_0_1_ph = $n_sroa_0_0_extract_trunc >>> ($125 >>> 0) & $130 | $n_sroa_1_4_extract_trunc << $126;
          $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($125 >>> 0) & $130;
          $q_sroa_0_1_ph = 0;
          $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $126;
          break;
        }
        if (($rem | 0) == 0) {
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        HEAP32[$rem >> 2] = 0 | $a$0 & -1;
        HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $66 = $d_sroa_0_0_extract_trunc - 1 | 0;
      if (($66 & $d_sroa_0_0_extract_trunc | 0) != 0) {
        $86 = (Math_clz32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 | 0;
        $88 = $86 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        $89 = 64 - $88 | 0;
        $91 = 32 - $88 | 0;
        $92 = $91 >> 31;
        $95 = $88 - 32 | 0;
        $105 = $95 >> 31;
        $sr_1_ph = $88;
        $r_sroa_0_1_ph = $91 - 1 >> 31 & $n_sroa_1_4_extract_trunc >>> ($95 >>> 0) | ($n_sroa_1_4_extract_trunc << $91 | $n_sroa_0_0_extract_trunc >>> ($88 >>> 0)) & $105;
        $r_sroa_1_1_ph = $105 & $n_sroa_1_4_extract_trunc >>> ($88 >>> 0);
        $q_sroa_0_1_ph = $n_sroa_0_0_extract_trunc << $89 & $92;
        $q_sroa_1_1_ph = ($n_sroa_1_4_extract_trunc << $89 | $n_sroa_0_0_extract_trunc >>> ($95 >>> 0)) & $92 | $n_sroa_0_0_extract_trunc << $91 & $88 - 33 >> 31;
        break;
      }
      if (($rem | 0) != 0) {
        HEAP32[$rem >> 2] = $66 & $n_sroa_0_0_extract_trunc;
        HEAP32[$rem + 4 >> 2] = 0;
      }
      if (($d_sroa_0_0_extract_trunc | 0) == 1) {
        $_0$1 = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$0 = 0 | $a$0 & -1;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      } else {
        $78 = _llvm_cttz_i32($d_sroa_0_0_extract_trunc | 0) | 0;
        $_0$1 = 0 | $n_sroa_1_4_extract_trunc >>> ($78 >>> 0);
        $_0$0 = $n_sroa_1_4_extract_trunc << 32 - $78 | $n_sroa_0_0_extract_trunc >>> ($78 >>> 0) | 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
    }
  } while (0);
  if (($sr_1_ph | 0) == 0) {
    $q_sroa_1_1_lcssa = $q_sroa_1_1_ph;
    $q_sroa_0_1_lcssa = $q_sroa_0_1_ph;
    $r_sroa_1_1_lcssa = $r_sroa_1_1_ph;
    $r_sroa_0_1_lcssa = $r_sroa_0_1_ph;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = 0;
  } else {
    $d_sroa_0_0_insert_insert99$0 = 0 | $b$0 & -1;
    $d_sroa_0_0_insert_insert99$1 = $d_sroa_1_4_extract_shift$0 | $b$1 & 0;
    $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0 | 0, $d_sroa_0_0_insert_insert99$1 | 0, -1, -1) | 0;
    $137$1 = tempRet0;
    $q_sroa_1_1198 = $q_sroa_1_1_ph;
    $q_sroa_0_1199 = $q_sroa_0_1_ph;
    $r_sroa_1_1200 = $r_sroa_1_1_ph;
    $r_sroa_0_1201 = $r_sroa_0_1_ph;
    $sr_1202 = $sr_1_ph;
    $carry_0203 = 0;
    while (1) {
      $147 = $q_sroa_0_1199 >>> 31 | $q_sroa_1_1198 << 1;
      $149 = $carry_0203 | $q_sroa_0_1199 << 1;
      $r_sroa_0_0_insert_insert42$0 = 0 | ($r_sroa_0_1201 << 1 | $q_sroa_1_1198 >>> 31);
      $r_sroa_0_0_insert_insert42$1 = $r_sroa_0_1201 >>> 31 | $r_sroa_1_1200 << 1 | 0;
      _i64Subtract($137$0, $137$1, $r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1) | 0;
      $150$1 = tempRet0;
      $151$0 = $150$1 >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1;
      $152 = $151$0 & 1;
      $154$0 = _i64Subtract($r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1, $151$0 & $d_sroa_0_0_insert_insert99$0, ((($150$1 | 0) < 0 ? -1 : 0) >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1) & $d_sroa_0_0_insert_insert99$1) | 0;
      $r_sroa_0_0_extract_trunc = $154$0;
      $r_sroa_1_4_extract_trunc = tempRet0;
      $155 = $sr_1202 - 1 | 0;
      if (($155 | 0) == 0) {
        break;
      } else {
        $q_sroa_1_1198 = $147;
        $q_sroa_0_1199 = $149;
        $r_sroa_1_1200 = $r_sroa_1_4_extract_trunc;
        $r_sroa_0_1201 = $r_sroa_0_0_extract_trunc;
        $sr_1202 = $155;
        $carry_0203 = $152;
      }
    }
    $q_sroa_1_1_lcssa = $147;
    $q_sroa_0_1_lcssa = $149;
    $r_sroa_1_1_lcssa = $r_sroa_1_4_extract_trunc;
    $r_sroa_0_1_lcssa = $r_sroa_0_0_extract_trunc;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = $152;
  }
  $q_sroa_0_0_insert_ext75$0 = $q_sroa_0_1_lcssa;
  $q_sroa_0_0_insert_ext75$1 = 0;
  $q_sroa_0_0_insert_insert77$1 = $q_sroa_1_1_lcssa | $q_sroa_0_0_insert_ext75$1;
  if (($rem | 0) != 0) {
    HEAP32[$rem >> 2] = 0 | $r_sroa_0_1_lcssa;
    HEAP32[$rem + 4 >> 2] = $r_sroa_1_1_lcssa | 0;
  }
  $_0$1 = (0 | $q_sroa_0_0_insert_ext75$0) >>> 31 | $q_sroa_0_0_insert_insert77$1 << 1 | ($q_sroa_0_0_insert_ext75$1 << 1 | $q_sroa_0_0_insert_ext75$0 >>> 31) & 0 | $carry_0_lcssa$1;
  $_0$0 = ($q_sroa_0_0_insert_ext75$0 << 1 | 0 >>> 31) & -2 | $carry_0_lcssa$0;
  return (tempRet0 = $_0$1, $_0$0) | 0;
}
// =======================================================================



  
function dynCall_ii(index,a1) {
  index = index|0;
  a1=a1|0;
  return FUNCTION_TABLE_ii[index&1](a1|0)|0;
}


function dynCall_iiii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  return FUNCTION_TABLE_iiii[index&7](a1|0,a2|0,a3|0)|0;
}


function dynCall_vi(index,a1) {
  index = index|0;
  a1=a1|0;
  FUNCTION_TABLE_vi[index&15](a1|0);
}

function b0(p0) {
 p0 = p0|0; nullFunc_ii(0);return 0;
}
function b1(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(1);return 0;
}
function b2(p0) {
 p0 = p0|0; nullFunc_vi(2);
}

// EMSCRIPTEN_END_FUNCS
var FUNCTION_TABLE_ii = [b0,___stdio_close];
var FUNCTION_TABLE_iiii = [b1,b1,___stdout_write,___stdio_seek,_do_read,___stdio_read,___stdio_write,b1];
var FUNCTION_TABLE_vi = [b2,b2,b2,b2,b2,b2,b2,_cleanup521,_cleanup526,b2,b2,b2,b2,b2,b2,b2];

  return { _i64Subtract: _i64Subtract, _free: _free, _main: _main, _i64Add: _i64Add, _memset: _memset, _malloc: _malloc, _memcpy: _memcpy, _bitshift64Lshr: _bitshift64Lshr, _fflush: _fflush, ___errno_location: ___errno_location, _bitshift64Shl: _bitshift64Shl, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, establishStackSpace: establishStackSpace, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_ii: dynCall_ii, dynCall_iiii: dynCall_iiii, dynCall_vi: dynCall_vi };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var real__i64Subtract = asm["_i64Subtract"]; asm["_i64Subtract"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Subtract.apply(null, arguments);
};

var real__free = asm["_free"]; asm["_free"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__free.apply(null, arguments);
};

var real__main = asm["_main"]; asm["_main"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__main.apply(null, arguments);
};

var real__i64Add = asm["_i64Add"]; asm["_i64Add"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Add.apply(null, arguments);
};

var real__malloc = asm["_malloc"]; asm["_malloc"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__malloc.apply(null, arguments);
};

var real__bitshift64Lshr = asm["_bitshift64Lshr"]; asm["_bitshift64Lshr"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__bitshift64Lshr.apply(null, arguments);
};

var real__fflush = asm["_fflush"]; asm["_fflush"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__fflush.apply(null, arguments);
};

var real____errno_location = asm["___errno_location"]; asm["___errno_location"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real____errno_location.apply(null, arguments);
};

var real__bitshift64Shl = asm["_bitshift64Shl"]; asm["_bitshift64Shl"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__bitshift64Shl.apply(null, arguments);
};
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _free = Module["_free"] = asm["_free"];
var _main = Module["_main"] = asm["_main"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _memset = Module["_memset"] = asm["_memset"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _fflush = Module["_fflush"] = asm["_fflush"];
var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
;

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.establishStackSpace = asm['establishStackSpace'];

Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];



// === Auto-generated postamble setup entry stuff ===


function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);


  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret, /* implicit = */ true);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status, implicit) {
  if (implicit && Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') implicitly called by end of main(), but noExitRuntime, so not exiting the runtime (you can use emscripten_force_exit, if you want to force a true shutdown)');
    return;
  }

  if (Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') called, but noExitRuntime, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)');
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

var abortDecorators = [];

function abort(what) {
  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}




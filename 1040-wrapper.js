var Module = {
    parameters: new Map(),
    output: new Map(),
    debug: false,
    initialized: false,
    onRuntimeInitialized: function() {
        Module.initialized = true;
    },
    doTaxes: function() {
        if (!Module.initialized) {
            throw 'Initialization not yet completed!'
        } else {
            var argv0 = allocate(intArrayFromString('dummy'), 'i8', ALLOC_NORMAL);
            var argv1 = allocate(intArrayFromString('-dummy'), 'i8', ALLOC_NORMAL);
            var argv = Module._malloc(32);
            writeArrayToMemory([argv0, argv1], argv);
            var result = Module.ccall('main', // name of C function
                'number', // return type
                ['number', 'number'], // argument types
                [2, argv]); // arguments
            Module._free(argv0);
            Module._free(argv1);
            Module._free(argv);
        }
    },
    begin_gains_and_losses: function(ptr) {
        if (Module.debug) {
            console.log('begin_gains_and_losses ' + Pointer_stringify(ptr));
        }
    },
    end_gains_and_losses: function(ptr) {
        if (Module.debug) {
            console.log('end_gains_and_losses ' + Pointer_stringify(ptr));
        }
    },
    showline: function(line, value, note) {
        Module.output.set(line, value);
        console.log(line + ' = ' + value + ' ' + note);
    },
    shownum: function(line, value, note) {
        Module.output.set(line, value);
        console.log(line + ' = ' + value + ' ' + note);
    },
    get_word_js: function(ptr) {
        if (Module.debug) {
            console.log('get_word');
        }

        // TODO Implement gains and losses
        writeAsciiToMemory(';', ptr);
    },
    get_parameter_js: function(kind, x, emssg) {
        var line = Pointer_stringify(emssg);
        var parameterValue = Module.parameters.get(line);

        if (Module.debug) {
            console.log('get_parameter: ' + line + ' = ' + parameterValue);
        }

        if (typeof(parameterValue) === 'string' || typeof(parameterValue) === 'object') {
            writeAsciiToMemory(parameterValue, x);
        } else if (typeof(parameterValue) === 'number') {
            setValue(x, parameterValue, 'double');
        } else {
            console.warn('Unknown type for parameter ' + line + ': ' + typeof(parameterValue) + '. Falling back to 0.0.');
            setValue(x, 0.0, 'double');
        }
    },
    get_parameters_js: function(kind, x, emssg) {
        if (Module.debug) {
            console.log('get_parameters: ' + line + ' = ' + parameterValue + ' -> get_parameter');
        }
        Module.get_parameter_js(kind, x, emssg);
    },
    noInitialRun: true,
    noExitRuntime: true
};

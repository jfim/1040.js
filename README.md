# 1040.js
US Taxes in JavaScript

## Use
```
<script type="text/javascript" src="1040-wrapper.js"></script>
<script async type="text/javascript" src="1040.js"></script>
```

```js
var parameters = new Map()
parameters.set('Status?',    'Single');
parameters.set('Under65?',   'Yes');
parameters.set('Dependents', 1.0);
parameters.set('L7',         50000.0);

Module.parameters = parameters;
Module.doTaxes()
Console.log("Your total tax is " + Module.output.get('L63'));
```

## Compile

`emcc taxsolve_US_1040_2016.c -o 1040.js -s EXPORTED_FUNCTIONS="['_main']"`

## License

GPLv2

## Credits

Tax computations come from [AstonRoberts' OpenTaxSolver](http://opentaxsolver.sourceforge.net/) and [contributors](http://opentaxsolver.sourceforge.net/credits.html)

Tax computations were converted to JavaScript using [emscripten](https://github.com/kripken/emscripten)

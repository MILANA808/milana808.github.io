const assert=require('assert'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('aksi-verifier.js','utf8');
const context={};context.window=context;vm.createContext(context);vm.runInContext(source,context);
assert.ok(context.AKSI_VERIFIER);
const supported=context.AKSI_VERIFIER.verify(
 'Париж — столица Франции. Эйфелева башня находится в Париже.',
 [{title:'France',text:'Париж — столица Франции. Эйфелева башня находится в Париже.'}]
);
assert.strictEqual(supported.supported,2);
assert.strictEqual(supported.unsupported,0);
const unsupported=context.AKSI_VERIFIER.verify(
 'Марс имеет океаны с жидкой водой. Компания X основана в 1890 году.',
 [{title:'Mars',text:'Марс — планета Солнечной системы.'}]
);
assert.strictEqual(unsupported.unsupported,2);
const partial=context.AKSI_VERIFIER.verify(
 'Марс — планета Солнечной системы с тонкой атмосферой.',
 [{title:'Mars',text:'Марс — планета Солнечной системы.'}]
);
assert.strictEqual(partial.partial,1);
assert.strictEqual(partial.coverage,0.5);
console.log('AKSI verifier tests: OK');

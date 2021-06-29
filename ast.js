export class Program {
    constructor() {
        this.debugging = false;
        this.procedures = [];
        this.globalProcedure = null;
    }

    compile() {
        return [this.globalProcedure, ...this.procedures]
            .map(x => x.compile(this))
            .join('\n') + '\nproc_$global();';
    }
}

export class ProcedureSection {
    constructor() {
        this.globalParagraph = null;
        this.paragraphs = [];
        this.name = null;
    }

    setName(name) {
        this.name = name.toLowerCase().replace(/-/g, '$');
    }

    compile(program) {
        return `function proc_${this.name || '$global'}() {
${[this.globalParagraph, ...this.paragraphs].map(x => x.compile(this)).join('\n')}
para_$global();
}`;
    }
}

export class Paragraph {
    constructor(name) {
        this.name = name && name.toLowerCase();
        this.sentences = [];
    }

    compile(program) {
        return `function para_${this.name || '$global'}() {
${this.sentences.map(x => x.compile(this)).join('\n')}}`;
    }
}

export class Sentence {
    constructor() {
        this.statements = [];
    }

    compile(program) {
        return this.statements.map(x => x.compile(program)).join('\n');
    }
}

export class Statement {}

export class DisplayStatement extends Statement {

    constructor() {
        super();
        this.operands = [];
    }

    compile(program) {
        return `console.log(${this.operands.map(x => x.compile(program)).join(',')});`
    }
}

export class Expression {}

export class IdentifierExpression extends Expression {
    constructor(name) {
        super();
        this.name = name.toLowerCase();
    }

    compile(program) {
        return this.name;
    }
}

export class Literal extends Expression {
    constructor(value) {
        super();
        this.value = value;
    }

    compile(program) {
        return JSON.stringify(this.value);
    }
}
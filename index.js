import CobolParser from "./compiler/CobolParser.js";
import CobolLexer from "./compiler/CobolLexer.js";
import CobolVisitor from "./compiler/CobolVisitor.js";
import antlr from 'antlr4';
import fs from 'fs';
import * as ast from './ast.js'

const input_text = fs.readFileSync(process.argv[2], {
    encoding: 'utf-8'
}).split(/[\r\n]{1,2}/g).map(x => {
    if (x[6] == '*') return '';
    const v = x.substr(7);
    console.log(`//${v}`);
    return v;
}).join('\n');

const input = new antlr.InputStream(input_text);

var tokenizer = new CobolLexer(input);
var parser = new CobolParser(new antlr.CommonTokenStream(tokenizer));

class Visitor extends CobolVisitor {

    constructor() {
        super();
        this.programs = [];
    }

    /**
     * 
     * @param {keyof Visitor} visitor 
     * @param {*} arr 
     */
    _visitAll(visitor, arr) {
        arr.map(x => this[visitor](x));
    }

    visitProgramUnit(ctx) {
        this._program = new ast.Program();
        this.visitChildren(ctx);
        this.programs.push(this._program);
        this._program = null;
    }

    visitSourceComputerParagraph(ctx) {
        this.visitChildren(ctx);
        this._program.debugging = ctx.children.filter(x => x.getText() && x.getText() == 'DEBUGGING').length > 0;
    }

    // PROCEDURE DIVISION procedureDivisionUsingClause? procedureDivisionGivingClause? DOT_FS procedureDeclaratives? procedureDivisionBody
    visitProcedureDivision(ctx) {
        this.visitChildren(ctx);
    }

    // paragraphs procedureSection*
    visitProcedureDivisionBody(ctx) {
        this._procedure = new ast.ProcedureSection();
        this.visitParagraphs(ctx.paragraphs());
        this._program.globalProcedure = this._procedure;

        ctx.procedureSection().map(x => this.visitProcedureSection(x));
    }

    // procedureSectionHeader DOT_FS paragraphs
    visitProcedureSection(ctx) {
        this._procedure = new ast.ProcedureSection();
        this.visitChildren(ctx);
        this._program.procedures.push(this._procedure);
        this._procedure = null;
    }

    // sectionName SECTION integerLiteral?
    visitProcedureSectionHeader(ctx) {
        this._procedure.name = ctx.sectionName().getText();
    }

    // sentence* paragraph*
    visitParagraphs(ctx) {
        this._paragraph = new ast.Paragraph(null);
        this._visitAll('visitSentence', ctx.sentence());
        this._procedure.globalParagraph = this._paragraph;
        this._paragraph = null;

        this._visitAll('visitParagraph', ctx.paragraph());
    }

    visitParagraph(ctx) {
        this._paragraph = new ast.Paragraph(ctx.paragraphName().getText());
        this.visitChildren(ctx);
    }

    visitSentence(ctx) {
        this._sentence = new ast.Sentence();
        this.visitChildren(ctx);
        this._paragraph.sentences.push(this._sentence);
        this._sentence = null;
    }

    // DISPLAY displayOperand+ displayAt? displayUpon? displayWith? onExceptionClause? notOnExceptionClause? END_DISPLAY?
    visitDisplayStatement(ctx) {
        this._statement = new ast.DisplayStatement();
        this.visitChildren(ctx);
        this._sentence.statements.push(this._statement);
        this._statement = null;
    }

    visitDisplayOperand(ctx) {
        this.visitChildren(ctx);
        this._statement.operands.push(this._expression);
    }

    visitIdentifier(ctx) {
        this._expression = new ast.IdentifierExpression(ctx.getText());
    }

    visitLiteral(ctx) {
        if (ctx.NONNUMERICLITERAL()) {
            var lit = ctx.getText();
            if (lit[0] == '"' || lit[0] == "'") {
                // regular string literal
                var value = lit.substr(1, lit.length - 2).replace(/""/g, '"')
                this._expression = new ast.Literal(value);
            }
        } else {
            // others are nonterminal
            this.visitChildren(ctx);
        }
    }

    visitBooleanLiteral(ctx) {
        this._expression = new ast.Literal(!!ctx.TRUE());
    }

    visitNumericLiteral(ctx) {
        if (ctx.NUMERICLITERAL()) {
            this._expression = new ast.Literal(Number.parseFloat(ctx.getText()));
        } else if (ctx.ZERO()) {
            this._expression = new ast.Literal(0);
        } else {
            this.visitChildren(ctx);
        }
    }

    visitIntegerLiteral(ctx) {
        this._expression = new ast.Literal(Number.parseInt(ctx.getText()));
    }
}

var visitor = new Visitor();

visitor.visitStartRule(parser.startRule());

console.log(visitor.programs[0].compile());
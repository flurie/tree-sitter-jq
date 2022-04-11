module.exports = grammar({
  name: "jq",

  word: ($) => $.keyword,

  rules: {
    program: ($) =>
      prec.left(
        1,
        choice(
          seq(optional($.module), repeat($.import_), repeat($.func_def)),
          seq(optional($.module), repeat($.import_), repeat($.exp))
        )
      ),
    module: ($) => seq("module", $.exp, ";"),
    // this is replaced with a repeat (0 or more) at the top level
    // _imports: ($) => seq($.import, $.imports),
    import_: ($) =>
      choice(seq($.import_what, ";"), seq($.import_what, $.exp, ";")),
    import_what: ($) =>
      choice(
        seq("import", $.import_from, "as", "$", $._IDENT),
        seq("import", $.import_from, "as", $._IDENT)
      ),
    import_from: ($) => $.string,
    // this is replaced with a repeat (0 or more) at the top level
    // _func_defs: ($) => seq($.func_def, $.func_defs),
    func_def: ($) =>
      choice(
        seq("def", $._IDENT, ":", $.exp, ";"),
        seq("def", $._IDENT, "(", repeat1($.param), ")", ":", $.exp, ";")
      ),
    // this is replaced with a repeat (0 or more) in the func_def
    // _params: ($) => choice($.param, seq($.params, ";", $.param)),
    param: ($) => choice(seq("$", $._IDENT), $._IDENT),
    exp: ($) =>
      prec.left(
        2,
        choice(
          seq($.func_def, $.exp),
          seq($.term, "as", $.pattern, "|", $.exp),
          seq("reduce", $.term, "as", $.pattern, "(", $.exp, ";", $.exp, ")"),
          seq(
            "foreach",
            $.term,
            "as",
            $.pattern,
            "(",
            $.exp,
            ";",
            $.exp,
            ";",
            $.exp,
            ")"
          ),
          seq("foreach", $.term, "as", $.pattern, "(", $.exp, ";", $.exp, ")"),
          seq("if", $.exp, "then", $.exp, $.else_body),
          seq("try", $.exp, "catch", $.exp),
          seq("try", $.exp),
          seq("label", "$", $._IDENT, "|", $.exp),
          seq($.exp, "?"),
          seq($.exp, "=", $.exp),
          seq($.exp, "or", $.exp),
          seq($.exp, "and", $.exp),
          seq($.exp, "//", $.exp),
          seq($.exp, "//=", $.exp),
          seq($.exp, "|=", $.exp),
          seq($.exp, alias("|", $.pipe), $.exp),
          seq($.exp, ",", $.exp),
          seq($.exp, "+", $.exp),
          seq($.exp, "+=", $.exp),
          seq("-", $.exp),
          seq($.exp, "-", $.exp),
          seq($.exp, "-=", $.exp),
          seq($.exp, "*", $.exp),
          seq($.exp, "*=", $.exp),
          seq($.exp, "/", $.exp),
          seq($.exp, "%", $.exp),
          seq($.exp, "/=", $.exp),
          seq($.exp, "%=", $.exp),
          seq($.exp, "==", $.exp),
          seq($.exp, "!=", $.exp),
          seq($.exp, "<", $.exp),
          seq($.exp, ">", $.exp),
          seq($.exp, "<=", $.exp),
          seq($.exp, ">=", $.exp),
          $.term
        )
      ),
    pattern: ($) =>
      choice(
        seq("$", $._IDENT),
        seq("[", $.array_pats, "]"),
        seq("{", $.obj_pats, "}")
      ),
    array_pats: ($) => choice($.pattern, seq($.array_pats, ",", $.pattern)),
    obj_pats: ($) => choice($.obj_pat, seq($.obj_pats, ",", $.obj_pat)),
    obj_pat: ($) =>
      choice(
        seq("$", $._IDENT),
        seq($._IDENT, ":", $.pattern),
        seq($.keyword, ":", $.pattern),
        seq($.string, ":", $.pattern),
        seq("(", $.exp, ")", ":", $.pattern)
      ),
    else_body: ($) =>
      choice(
        seq("elif", $.exp, "then", $.exp, $.else_body),
        seq("else", $.exp, "end")
      ),
    term: ($) =>
      prec.right(
        1,
        choice(
          ".",
          "..",
          seq("break", "$", $._IDENT),
          seq($.term, $._FIELD, optional("?")),
          seq($._FIELD, optional("?")),
          seq($.term, ".", $.string),
          seq(".", $.string),
          seq($.term, ".", $.string),
          seq(".", $.string),
          seq($.term, "[", $.exp, "]", optional("?")),
          seq($.term, "[", "]", optional("?")),
          seq($.term, "[", $.exp, ":", $.exp, "]", optional("?")),
          seq($.term, "[", $.exp, ":", "]", optional("?")),
          seq($.term, "[", ":", $.exp, "]", optional("?")),
          $._LITERAL,
          $.string,
          $._FORMAT,
          seq("(", $.exp, ")"),
          seq("[", $.exp, "]"),
          seq("[", "]"),
          seq("{", $.mk_dict, "}"),
          seq("$", "__loc__"),
          seq("$", $._IDENT),
          $._IDENT,
          seq($._IDENT, "(", $.args, ")")
        )
      ),
    args: ($) => choice($.arg, seq($.args, ";", $.arg)),
    arg: ($) => $.exp,
    mk_dict: ($) => choice($.mk_dict_pair, seq($.mk_dict_pair, ",", $.mk_dict)),
    mk_dict_pair: ($) =>
      choice(
        seq($._IDENT, ":", $.exp_d),
        seq($.keyword, ":", $.exp_d),
        seq($.string, ":", $.exp_d),
        $.string,
        seq("$", $._IDENT),
        $._IDENT,
        seq("(", $.exp, ")", ":", $.exp_d)
      ),
    exp_d: ($) =>
      prec.left(choice(seq($.exp_d, "|", $.exp_d), seq("-", $.exp_d), $.term)),
    keyword: ($) =>
      /module|import|include|def|as|if|then|else|elif|end|and|or|reduce|foreach|try|catch|label|break|__loc__/,
    string: ($) =>
      choice(seq('"', $._QQSTRING, '"'), seq($._FORMAT, '"', $._QQSTRING, '"')),
    _IDENT: ($) => /([a-zA-Z_][a-zA-Z_0-9]*::)*[a-zA-Z_][a-zA-Z_0-9]*/,
    _FIELD: ($) => /\.[a-zA-Z_][a-zA-Z_0-9]*/,
    _QQSTRING: ($) => choice(seq('"', '"'), seq('"', $._string_content, '"')),
    _LITERAL: ($) => {
      const hex_literal = seq(choice("0x", "0X"), /[\da-fA-F]+/);

      const decimal_digits = /\d+/;
      const signed_integer = seq(optional(choice("-", "+")), decimal_digits);
      const exponent_part = seq(choice("e", "E"), signed_integer);

      const binary_literal = seq(choice("0b", "0B"), /[0-1]+/);

      const octal_literal = seq(choice("0o", "0O"), /[0-7]+/);

      const decimal_integer_literal = seq(
        optional(choice("-", "+")),
        choice("0", seq(/[1-9]/, optional(decimal_digits)))
      );

      const decimal_literal = choice(
        seq(
          decimal_integer_literal,
          ".",
          optional(decimal_digits),
          optional(exponent_part)
        ),
        seq(".", decimal_digits, optional(exponent_part)),
        seq(decimal_integer_literal, optional(exponent_part))
      );

      return token(
        choice(hex_literal, decimal_literal, binary_literal, octal_literal)
      );
    },
    _FORMAT: ($) => /"@"[a-zA-Z0-9_]+/,
    _string_content: ($) =>
      repeat1(choice(token.immediate(/[^\\"\n]+/), $._escape_sequence)),

    _escape_sequence: ($) =>
      token.immediate(seq("\\", /(\"|\\|\/|b|f|n|r|t|u)/)),
  },
});

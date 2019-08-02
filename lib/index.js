const ANY = {type: ['object', 'array', 'boolean', 'number', 'string']};

const ARRAY = Object.freeze({type: 'array'});
const BOOLEAN = Object.freeze({type: 'boolean'})
const INTEGER = Object.freeze({type: 'integer'});
const NUMBER = Object.freeze({type: 'number'});
const OBJECT = Object.freeze({type: 'object'});
const STRING = Object.freeze({type: 'string'});

const STRING_LENGTHS = {tiny: 255, medium: 16777215, long: 4294967295};

// Logic for transforming Sequelize attributes to JSON-Schema property.
const _TRANSFORMS = {
  // ABSTRACT: null,

  ARRAY(att) {
    return {
      type: 'array',
      items: attributeSchema({type: att.type.type})
    };
  },

  BIGINT() {return {...INTEGER, format: 'int64'};},
  BLOB() {return {...STRING, contentEncoding: 'base64'};},
  BOOLEAN() {return {...BOOLEAN};},
  CHAR() {return {...STRING};},
  CIDR() {return {...STRING};},
  CITEXT(att) {return _TRANSFORMS.STRING(att)},
  DATE() {return {...STRING, format: 'date-time'};},
  DATEONLY() {return {...STRING, format: 'date'};},
  DECIMAL() {return {...NUMBER};},

  // This is the `key` for DOUBLE datatypes... ¯\_(ツ)_/¯
  'DOUBLE PRECISION'() {return {...NUMBER, format: 'double'};},

  ENUM(att)  {
    return {type: 'enum', values: [...att.values]};
  },

  FLOAT() {return {...NUMBER, format: 'float'};},
  // GEOGRAPHY: null,
  // GEOMETRY: null,
  // HSTORE: null,
  INET() {return {type: [{...STRING, format: 'ipv4'}, {...STRING, format: 'ipv6'}]};},
  INTEGER() {return {...INTEGER, format: 'int32'};},
  JSON() {return {...ANY};},
  JSONB() {return {...ANY};},
  MACADDR() {return {...STRING};},
  MEDIUMINT() {return {...INTEGER};},
  // NOW: null,
  NUMBER() {return {...NUMBER};},
  // RANGE: null,
  REAL() {return {...NUMBER};},
  SMALLINT() {return {...INTEGER};},

  STRING(att) {
    const schema = {...STRING};
    let length = att.type.options && att.type.options.length;

    // Resolve aliases
    length = STRING_LENGTHS[length] || length;
    if (length) schema.maxLength = length;

    return schema;
  },

  TEXT(att) {
    return _TRANSFORMS.STRING(att);
  },

  TIME() {return {...STRING, format: 'time'};},

  TINYINT() {return {...NUMBER};},
  UUID() {return {...STRING, format: 'uuid'};},
  UUIDV1() {return {...STRING, format: 'uuid'};},
  UUIDV4() {return {...STRING, format: 'uuid'};},

  VIRTUAL(att) {
    // Can we just get Optional Chaining support already... :-D
    const returnType = att.type && att.returnType;
    return attributeSchema({type: att.returnType});
  },
};

/**
 * @param {Attribute} att Sequelize attribute
 * @returns {Object} JSON Schema
 */
function attributeSchema(att) {
  const transform = att && att.type && _TRANSFORMS[att.type.key];
  let schema = transform ? transform(att) : transform;

  // Use loose schema for unknown, untransformable attributes
  if (!schema) schema = ANY;

  // Add 'null' type?
  if (att.allowNull) {
    if (!Array.isArray(schema.type)) schema.type = [schema.type];
    schema.type.push('null');
  }

  return schema;
}

/**
 * Generates JSON Schema by specified Sequelize Model
 *
 * @param {Model} model Sequelize.Model to schema-ify
 * @param {Object} options Optional options
 * @param {Boolean} options.alwaysRequired
 * @param {Array} options.atts
 * @param {Array} options.exclude
 * @param {Array} options.private
 */
module.exports = (model, options = {}) => {
  const schema = {
    type: 'object',
    properties: {},
    required: []
  };

  let exclude = options.exclude || options.private || [];
  let atts = options.attributes || Object.keys(model.rawAttributes);
  if (exclude) atts = atts.filter(k => !exclude.includes(k));

  for (const attName of atts) {
    let att = model.rawAttributes[attName];
    if (!att) continue;

    schema.properties[attName] = attributeSchema(att);
    if (att.allowNull === false || options.alwaysRequired) {
      schema.required.push(attName);
    }
  }

  return schema;
};

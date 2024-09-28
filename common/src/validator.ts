import Ajv from 'ajv'
import project_definition from '../schema/def.schema.json'

export const ajv = new Ajv({ allErrors: true, allowUnionTypes: true })
export const projects_validator = ajv.compile(project_definition)

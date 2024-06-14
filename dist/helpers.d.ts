import { JSONSchema7TypeName } from 'json-schema';
import { LensSource, LensMap, LensIn, Property, AddProperty, RemoveProperty, RenameProperty, HoistProperty, PlungeProperty, WrapProperty, HeadProperty, ValueMapping, ConvertValue, ExtractEntity } from './lens-ops';
export declare function addProperty(property: Property): AddProperty;
export declare function removeProperty(property: Property): RemoveProperty;
export declare function renameProperty(source: string, destination: string): RenameProperty;
export declare function hoistProperty(host: string, name: string): HoistProperty;
export declare function plungeProperty(host: string, name: string): PlungeProperty;
export declare function wrapProperty(name: string): WrapProperty;
export declare function headProperty(name: string): HeadProperty;
export declare function inside(name: string, lens: LensSource): LensIn;
export declare function map(lens: LensSource): LensMap;
export declare function convertValue(name: string, mapping: ValueMapping, sourceType?: JSONSchema7TypeName, destinationType?: JSONSchema7TypeName): ConvertValue;
export declare function extract(host: string, name: string, fields: string[]): ExtractEntity;

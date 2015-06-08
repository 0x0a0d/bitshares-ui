ByteBuffer = require '../common/bytebuffer'
EC = require '../common/error_with_cause'

class Serializer
    
    constructor: (@operation_name, @types) ->
        
    fromByteBuffer: (b) ->
        object = {}
        field = null
        try
            for field in Object.keys @types
                type = @types[field]
                object[field] = type.fromByteBuffer b
        
        catch error
            EC.throw @operation_name+'.'+field, error
        
        object
    
    appendByteBuffer: (b, object) ->
        field = null
        try
            for field in Object.keys @types
                type = @types[field]
                type.appendByteBuffer b, object[field]
        
        catch error
            try
                EC.throw @operation_name+'.'+field+" = "+
                    JSON.stringify(object[field]), error
            catch e # circular ref
                EC.throw @operation_name+'.'+field+" = "+
                    object[field], error
        return
    
    fromObject: (serialized_object)->
        result = {}
        field = null
        try
            for field in Object.keys @types
                type = @types[field]
                object = type.fromObject serialized_object[field]
                result[field] = object
            
        catch error
            EC.throw @operation_name+'.'+field, error
        
        result
    
    toObject: (serialized_object, use_default = no)->
        result = {}
        field = null
        try
            for field in Object.keys @types
                type = @types[field]
                object = type.toObject serialized_object?[field], use_default
                result[field] = object
        
        catch error
            EC.throw @operation_name+'.'+field, error
        
        result
    
    # <helper_functions>
    
    fromHex: (hex) ->
        b = ByteBuffer.fromHex hex, ByteBuffer.LITTLE_ENDIAN
        @fromByteBuffer b
    
    toHex: (object) ->
        b=@toByteBuffer object
        b.toHex()
    
    toByteBuffer: (object) ->
        b = new ByteBuffer ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN
        @appendByteBuffer b, object
        b.copy 0, b.offset
    
    toBuffer: (object)->
        new Buffer(@toByteBuffer(object).toBinary(), 'binary')
    
    # </helper_functions>

        
module.exports = Serializer


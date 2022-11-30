const Sequelize = require('sequelize');
const db = require('../config/db')
const bcrypt = require('bcrypt-nodejs');

const usuarios = db.define('usuarios',{
    id:{
        type:Sequelize.INTEGER,
        primaryKey:true,
        autoIncrement:true
    },
    nombre:Sequelize.STRING(60),
    imagen:Sequelize.STRING(60),
    descripcion:{ 
        type:Sequelize.TEXT,
    },

    email: {
        type: Sequelize.STRING(30),
        allowNull: false,
        validate: {
            isEmail: { msg : 'Agrega un correo valido'},
            // notEmpty: { msg : 'Correo Obligatorio'},
            isUnique: function (value,next) {
                var self = this;
                usuarios.findOne({where: {email: value}})
                    .then(function (usuario) {
                        if (usuario && self.id !== usuario.id) {
                            return next('El usuario ya esta registrado');
                        }
                        return next();
                    })
                    .catch(function (err) {
                        return next(err);
                    });
            }
        }
    },
    password:{
        type:Sequelize.STRING(60),
        allowNull:false,
        validate:{
            notEmpty:{
                msg:'El password no puede ir vacio'
            }
        }
    },
    activo:{
        type:Sequelize.INTEGER,
        defaultValue:0
    },
    tokenPassword:Sequelize.STRING,
    expiraToken:Sequelize.DATE
},{
    hooks:{
        beforeCreate(usuario){
            usuario.password = usuarios.prototype.hashPassword(usuario.password);
        }
    }
})

//Metodo para comparar los passwords
usuarios.prototype.validarPassword = function(password){
    return bcrypt.compareSync(password,this.password);
}

usuarios.prototype.hashPassword = function(password){
    return bcrypt.hashSync(password,bcrypt.genSaltSync(10),null);
}
module.exports = usuarios;
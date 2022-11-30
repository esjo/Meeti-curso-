const usuarios = require('../models/usuarios');
const enviarEmail = require('../handlers/emails');

const multer = require('multer');
const shortid = require('shortid');
//const { MulterError } = require('multer');
const fs = require('fs');

const configuracionMulter = {
    limits: {fileSize:1000000},
    storage: fileStorage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, __dirname+'/../public/uploads/perfiles/')
          },
        filename : (req,file,cb) =>{
            //mimetype = aplication/extencion por eso el split
            const extencion = file.mimetype.split('/')[1];
            cb(null, `${shortid.generate()}.${extencion}`)
        }
    }),
    fileFilter(req,file,next){
        if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'){
            //El formato es valido
            next(null,true);
        }else{
            //El formato no es valido
            next(new Error('Formato no válido'),false);
        }
    }
}

const upload = multer(configuracionMulter).single('imagen');


//Sube una imagen en el servidor
exports.subirImagen = (req,res,next) =>{
    upload(req,res,function(error){
        if(error){
            if(error instanceof multer.MulterError){
                if(error.code === 'LIMIT_FILE_SIZE'){
                    req.flash('error', 'El archivo es muy grande')
                }else{
                    req.flash('error',error.message);
                }
            }else if(error.hasOwnProperty('message')){
                req.flash('error',error.message);
            }
            res.redirect('back');
            return;
        }else{
            next();
        }
    })
}



exports.formCrearCuenta = (req,res) =>{
    res.render('crear-cuenta',{
        nombrePagina:"Crear cuenta"
    })
};

exports.crearNuevaCuenta = async (req,res) =>{
    const usuario = req.body;

    req.checkBody('confirmar','El password confirmado no puede ir vacio').notEmpty();
    req.checkBody('confirmar','El password es diferente').equals(req.body.password);

    //Leer los errores de express
    const erroresExpress = req.validationErrors();


    try {
        await usuarios.create(usuario);

        //URL de confirmación
        const url = `http://${req.headers.host}/confirmar-cuenta/${usuario.email}`;

        //Enviar email de confirmación

        await enviarEmail.enviarEmail({
            usuario,
            url,
            subject : 'Confirma tu cuenta de Meeti',
            archivo: 'confirmar-cuenta'
        })

        //flash message y redireccionar
        req.flash('exito','Hemos enviado un Email, confirma tu cuenta');
        res.redirect('/iniciar-sesion');
    } catch (error) {

        //extraer el message de los errores 
        const erroresSequelize = error.errors.map(err => err.message);

        //Extraer unicamente el msg de los errores 
        const errExp = erroresExpress.map(err => err.msg);

        //Unirlos 
        const listaErrores = [...erroresSequelize,...errExp];

        req.flash('error',listaErrores);
        res.redirect('/crear-cuenta');
    }
    
}


//Confirma la suscripción del usuario
exports.confirmarCuenta = async (req,res,next) =>{
    //verificar que el usuario existe
    const usuario = await usuarios.findOne({where:{email:req.params.email}});

    //sino existe, rediccionar 
    if(!usuario){
        req.flash('error','No existe esa cuenta');
        res.redirect('/crear-cuenta');
        return next();
    }

    //Si existe, confirmar suscripción y redireccionar 
    usuario.activo = 1;
    await usuario.save();

    req.flash('exito','La cuenta se ha confirmado ya puedes iniciar sesión');
    res.redirect('/iniciar-sesion');

}


//Formulario para iniciar sesión
exports.formIniciarSesion = (req,res) => {
    res.render('iniciar-sesion',{
        nombrePagina:"iniciar sesión"
    });
}

//Muestra el formulario para editar el perfil
exports.formEditarPerfil = async(req,res) =>{
    const usuario = await usuarios.findByPk(req.user.id);

    res.render('editar-perfil',{
        nombrePagina: 'Editar perfil',
        usuario
    })

}

//Almacena en la base de datos los cambios al perfil
exports.editarPerfil = async(req,res) =>{
    const usuario = await usuarios.findByPk(req.user.id);

    //leer datos del form
    req.sanitizeBody('nombre');
    req.sanitizeBody('email');
    const {nombre,descripcion,email} = req.body;

    //asignar valores
    usuario.nombre = nombre;
    usuario.descripcion = descripcion;
    usuario.email = email;

    //guardar en la base de datos
    await usuario.save();
    req.flash('exito','Cambios guardados con exito');
    res.redirect('/adminstracion')
}


exports.formCambiarPassword = (req,res) =>{
    res.render('cambiar-password',{
        nombrePagina:'Cambiar password'
    })
}

exports.cambiarPassword = async(req,res,next) => {

    req.checkBody('anterior','El password no puede ir vacio').notEmpty();
    req.checkBody('nuevo','El nuevo password no puede ir vacio').notEmpty();

    const errores = req.validationErrors();
    //


    const usuario = await usuarios.findByPk(req.user.id);

    //verificar que el password actual sea correcto
    if(!usuario.validarPassword(req.body.anterior)){
        req.flash('error','El password actual es incorrecto');
        res.redirect('/adminstracion');
        return next();
    }


        //Si es l password es correcto hashear el nuevo
    const hash = usuario.hashPassword(req.body.nuevo);

    //asignar el password al usuario
    usuario.password = hash;
    
    //guardar en la base de datos 
    await usuario.save();

    //redireccionar 
    req.logout(async(err) =>{
        if(err){
            return next();      
        } 
        await req.flash('exito','Se ha cambiado correctamente, vulve a iniciar sesión');
        res.redirect('/adminstracion');
    });
    
    
}


//Muestra el formulario para subir una imagen de perfil
exports.formSubirImagenPerfil = async(req,res) =>{
    const usuario = await usuarios.findByPk(req.user.id);

    //mostra la vista
    res.render('imagen-perfil',{
        nombrePagina:'Subir imagen pefil',
        usuario
    })
}



//Guarda la imagen nueva, elimina la anterior (si aplica) y guarda registro en la base de datos
exports.subirImagenPerfil = async(req,res) =>{   
    const usuario = await usuarios.findByPk(req.user.id);

    //Si hay imagen anterior eliminarla 
    if(req.file && usuario.imagen){
        const imagenAnteriorPath = __dirname + `/../public/uploads/perfiles/${usuario.imagen}`;

        //eliminar archivo con fileSystem
        fs.unlink(imagenAnteriorPath, (error) =>{
            if(error){
                console.log(error);
            }
            return;
        })
    }

    //almacenar la nueva imagen
    if(req.file){
        usuario.imagen = req.file.filename;
    }


    //almacenar en la base de datos y redireccionar 
    await usuario.save();
    req.flash('exito', 'Cambios almacenados correctamente');
    res.redirect('/adminstracion');

}
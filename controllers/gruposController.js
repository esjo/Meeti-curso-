const Categorias = require('../models/Categorias');
const Grupos = require('../models/Grupos');

const multer = require('multer');
const shortid = require('shortid');
//const { MulterError } = require('multer');
const fs = require('fs');
const uuid = require('uuid').v4;


const configuracionMulter = {
    limits: {fileSize:1000000},
    storage: fileStorage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, __dirname+'/../public/uploads/grupos/')
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

exports.formNuevoGrupo = async(req,res) =>{

    const categorias = await Categorias.findAll();

    res.render('nuevo-grupo',{
        nombrePagina : 'Crea un nuevo grupo',
        categorias
    })
}


//Almacena los grupos en la base de datos
exports.crearGrupo = async(req,res) =>{

    //sanitizar 
    req.sanitizeBody('nombre');
    req.sanitizeBody('url');

    const grupo = req.body;

    //Almacena el usuario autenticado como creador del grupo
    grupo.usuarioId = req.user.id;
    grupo.categoriaId = req.body.categoria;

    //console.log(req.file);
    //Leer la imagen

    if(req.file){
        grupo.imagen = req.file.filename;
    }

    grupo.id = uuid();
    

    try {
        //Almacenar en la base de datos
        await Grupos.create(grupo);
        req.flash('exito','Se ha creado el grupo correctamente');
        res.redirect('/adminstracion');
    } catch (error) {

        //extraer el message de los errores 
        const erroresSequelize = error.errors.map(err => err.message);

        
        req.flash('error',erroresSequelize);
        res.redirect('/nuevo-grupo');
    }


}

exports.formEditarGrupo = async(req,res) =>{

    const consultas = [];
    consultas.push(Grupos.findByPk(req.params.grupoId));
    consultas.push(Categorias.findAll())

    //Promise con await
    const [grupo, categorias] = await Promise.all(consultas);

    res.render('editar-grupo',{
        nombrePagina: `Editar grupo: ${grupo.nombre}`,
        grupo,
        categorias
    })
}

//Guarda los cambios en la base de datos
exports.editarGrupo = async(req,res,next) =>{
    const grupo = await Grupos.findOne({where : {id: req.params.grupoId, usuarioId: req.user.id}});


    console.log(grupo);

    //Si no existe el grupo o no es el dueño
    if(!grupo){
        req.flash('error', 'Operación no valida');
        res.redirect('/adminstracion');
        return res.next();
    }

    const {nombre,descripcion,categoria,url} = req.body;

    console.log(req.body)
    //Asignar los valores
    grupo.nombre = nombre;
    grupo.descripcion = descripcion;
    grupo.categoriaId = categoria;
    grupo.url = url;

    //gruardar en la base de datos
    await grupo.save();
    req.flash('exito','Cambios Almacenados correctamente');

    res.redirect('/adminstracion');

    
}

//Formulario para editar imagen
exports.formEditarImagen = async(req,res) => {
    const grupo = await Grupos.findOne({where : {id: req.params.grupoId, usuarioId: req.user.id}});

    res.render('imagen-grupo',{
        nombrePagina:`Editar imagen grupo: ${grupo.nombre}`,
        grupo
    })
}

//Modificar la imagen en la BD y elimina la anterior
exports.editarImagen = async(req,res,next) =>{
    const grupo = await Grupos.findOne({where : {id: req.params.grupoId, usuarioId: req.user.id}});

    //el grupo existe y es valido
    if(!grupo){
        req.flash('error','Operación novalida');
        req.redirect('/iniciar-sesion');
        return next();
    }

    //verificar que el archivo sea nuevo
    /* if(req.file){
        console.log(req.file.filename);
    } */

    //revisar que exista un archivo anterior
    /* if(grupo.imagen){
        console.log(grupo.imagen);
    } */

    //Si hay imagen anterior y nueva, significa que vamos a borrar la anterior
    if(req.file && grupo.imagen){
        const imagenAnteriorPath = __dirname + `/../public/uploads/grupos/${grupo.imagen}`;

        //eliminar archivo con fileSystem
        fs.unlink(imagenAnteriorPath, (error) =>{
            if(error){
                console.log(error);
            }
            return;
        })
    }

    //Si hay una imagen nueva, la guardamos
    if(req.file){
        grupo.imagen = req.file.filename;
    }

    //guardar en la base de datos
    await grupo.save();
    req.flash('exito', 'Cambios almacenados correctamente');
    res.redirect('/adminstracion');
}

//Formulario para eliminar grupo
exports.formEliminarGrupo = async(req,res,next) =>{
    const grupo = await Grupos.findOne({where: {id:req.params.grupoId, usuarioId:req.user.id }});

    if(!grupo){
        req.flash('error','Operación no valida');
        res.redirect('/adminstracion');
        return next();
    }

    //Todo correcto
    res.render('eliminar-grupo',{
        nombrePagina: `Eliminar grupo: ${grupo.nombre}`,
    })
}

//Elimina el grupo e imagen
exports.eliminarGrupo = async(req,res,next) =>{
    const grupo = await Grupos.findOne({where: {id:req.params.grupoId, usuarioId:req.user.id }});

    if(!grupo){
        req.flash('error','Operación no valida');
        res.redirect('/adminstracion');
        return next();
    }

    //Si hay una imagen, eliminarla
    if(grupo.imagen){
        const imagenAnteriorPath = __dirname + `/../public/uploads/grupos/${grupo.imagen}`;
        fs.unlink(imagenAnteriorPath, (error) =>{
            if(error){
                console.log(error);
            }
            return;
        });
    }

    //eliminar el grupo
    await Grupos.destroy({
        where:{id:req.params.grupoId}
    });

    req.flash('exito','Grupo eliminado');
    res.redirect('/adminstracion');
}
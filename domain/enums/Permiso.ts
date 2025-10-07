export enum Permiso {
    // Permisos de Sala
    CREAR_SALA = 'crear_sala',
    MODIFICAR_SALA = 'modificar_sala',

    // Permisos de Publicación
    PUBLICAR_EN_SALA = 'publicar_en_sala',

    // Permisos de Usuario
    AGREGAR_USUARIO = 'agregar_usuario',
    ELIMINAR_USUARIO = 'eliminar_usuario',

    // Permisos de Proyecto
    CREAR_PROYECTO = 'crear_proyecto',
    ELIMINAR_PROYECTO = 'eliminar_proyecto',
    MODIFICAR_PROYECTO = 'modificar_proyecto',
    AGREGAR_ACTIVIDAD_A_PROYECTO = 'agregar_actividad_a_proyecto',
    AGREGAR_MISION_A_PROYECTO = 'agregar_mision_a_proyecto',
    DELEGAR_ASIGNACION_DE_ACTIVIDAD_MISION = 'delegar_asignacion_de_actividad_mision',

    // Permisos de Pizarra
    PUBLICAR_EN_PIZARRA = 'publicar_en_pizarra',
    TOMAR_DE_PIZARRA = 'tomar_de_pizarra',

    // Permisos de Visualización
    VER_CAPTURAS_PROYECTO = 'ver_capturas_proyecto',
    VER_CAPTURAS_USUARIO = 'ver_capturas_usuario',

    // Permisos de Organización
    VER_NOMBRE_ORGANIZACION = 'ver_nombre_organizacion',
    VER__IMAGEN_ORGANIZACION = 'ver_imagen_organizacion',
    VER_ORGANIZACION_PROYECTOS = 'ver_proyectos_organizacion'
}
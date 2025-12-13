// Función unificada para formatear nombre de usuario
// Usada en todas las vistas para mantener consistencia
export const formatUserName = (user) => {
  if (!user) return '';
  
  let displayName = '';
  
  // Si tiene el campo displayName personalizado, usarlo
  if (user.displayName) {
    // Extraer primer nombre y primer apellido de displayName
    const nameParts = user.displayName.trim().split(' ');
    if (nameParts.length >= 2) {
      displayName = `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
    } else if (nameParts.length === 1) {
      displayName = nameParts[0];
    }
  } else if (user.firstName && user.lastName) {
    // Usar firstName y primer apellido
    const lastNameParts = user.lastName.trim().split(' ');
    displayName = `${user.firstName} ${lastNameParts[0]}`;
  } else if (user.username) {
    // Usar username como último recurso
    displayName = user.username;
  }
  
  return displayName;
};

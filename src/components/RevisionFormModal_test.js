/* eslint-disable */
import React, { useState, useEffect } from 'react';

const RevisionFormModalTest = ({ isOpen, onClose, onSubmit, loading }) => {
  // Variables que causan problemas
  const [almacenesUbicacionFolios, setAlmacenesUbicacionFolios] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [userModalFeedback, setUserModalFeedback] = useState(null);

  useEffect(() => {
    if (isOpen) {
      console.log('Test:', almacenesUbicacionFolios);
      setLoadingCatalogos(true);
      setUserModalFeedback({ type: 'test', message: 'Test' });
    }
  }, [isOpen, almacenesUbicacionFolios]);

  return (
    <div>
      <p>Test Component</p>
    </div>
  );
};

export default RevisionFormModalTest;

import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

export default function AnexosTab({ id }) {
  const [fields, setFields] = useState([]);
  const [data, setData] = useState({});
  const [tableName] = useState('pi_anexos'); // Nombre de la tabla específica para Anexos
  const [loading, setLoading] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Función para obtener archivos en el frontend, utilizando caracterizacion_id
  const fetchFiles = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const filesResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${id}/files`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            source: 'anexos', // Filtramos por source 'anexos'
          },
        }
      );
      console.log("Fetched files:", filesResponse.data.files); // LOG para ver los archivos recibidos
      setUploadedFiles(filesResponse.data.files);
    } catch (error) {
      console.error('Error obteniendo los archivos:', error);
      setError('Error obteniendo los archivos');
    }
  }, [tableName, id]);

  useEffect(() => {
    const fetchFieldsAndData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Obtener los campos de la tabla `pi_anexos`
        const fieldsResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/fields`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setFields(fieldsResponse.data);

        // Verificar si ya existe un registro en `pi_anexos` con `caracterizacion_id`
        const recordsResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/records?caracterizacion_id=${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (recordsResponse.data.length > 0) {
          // Si existe el registro, configuramos `recordId` y cargamos los archivos
          const existingRecord = recordsResponse.data[0];
          console.log("Existing record found:", existingRecord); // LOG para ver el registro encontrado
          setData(existingRecord);
          setRecordId(existingRecord.id);
          await fetchFiles(); // Llamar a fetchFiles para obtener archivos de `caracterizacion_id`
        } else {
          // Si no existe, creamos el registro y luego cargamos los archivos
          console.log("No existing record found, creating a new one."); // LOG para verificar creación
          const createResponse = await axios.post(
            `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/record`,
            { caracterizacion_id: id },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          console.log("New record created:", createResponse.data); // LOG para ver el nuevo registro creado
          setRecordId(createResponse.data.id); // Configuramos el nuevo `recordId`
          await fetchFiles(); // Llamar a fetchFiles para obtener archivos de `caracterizacion_id`
        }

        setLoading(false);
      } catch (error) {
        console.error('Error obteniendo los campos o datos:', error);
        setError('Error obteniendo los campos o datos');
        setLoading(false);
      }
    };

    fetchFieldsAndData();
  }, [tableName, id, fetchFiles]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileNameChange = (e) => {
    setFileName(e.target.value);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file || !fileName) {
      alert('Por favor, ingresa un nombre y selecciona un archivo');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('caracterizacion_id', id);
      formData.append('source', 'anexos');

      console.log("Uploading file with recordId:", recordId); // LOG para ver el recordId en el momento de subir el archivo

      // Subir archivo al registro existente o recién creado
      await axios.post(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      await fetchFiles(); // Actualizar la lista de archivos después de subir uno nuevo
      setFile(null);
      setFileName('');
      setShowUploadForm(false);
    } catch (error) {
      console.error('Error subiendo el archivo:', error);
      setError('Error subiendo el archivo');
    }
  };

  const handleFileDelete = async (fileId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este archivo?')) {
      try {
        const token = localStorage.getItem('token');
        console.log("Attempting to delete file with file ID:", fileId, "and record ID:", recordId); // LOG para verificar los IDs
        
        // Llamada DELETE con fileId y recordId en la URL
        await axios.delete(
          `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}/file/${fileId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
  
        await fetchFiles(); // Actualizar la lista después de eliminar el archivo
      } catch (error) {
        console.error('Error eliminando el archivo:', error);
        setError('Error eliminando el archivo');
      }
    }
  };
  

  return (
    <div>
      <h3>Anexos</h3>
      {loading ? (
        <p>Cargando campos...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div>
          <div className="mt-4" style={{ width: '100%' }}>
            <h5>Archivos adicionales</h5>
            {!showUploadForm && (
              <button
                className="btn btn-primary btn-sm btn-block mb-2"
                onClick={() => setShowUploadForm(true)}
              >
                Subir documento
              </button>
            )}

            {showUploadForm && (
              <form onSubmit={handleFileUpload}>
                <div className="form-group">
                  <label>Nombre del archivo</label>
                  <input
                    type="text"
                    className="form-control"
                    value={fileName}
                    onChange={handleFileNameChange}
                  />
                </div>
                <div className="form-group">
                  <label>Seleccionar archivo</label>
                  <input
                    type="file"
                    className="form-control"
                    onChange={handleFileChange}
                  />
                </div>
                <button type="submit" className="btn btn-success btn-sm btn-block mb-2">
                  Cargar archivo
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm btn-block"
                  onClick={() => setShowUploadForm(false)}
                >
                  Cancelar
                </button>
              </form>
            )}

            {/* Lista de archivos subidos */}
            {uploadedFiles.length > 0 ? (
              <ul className="list-group mt-3">
                {uploadedFiles.map((file) => (
                  <li
                    key={file.id}
                    className="list-group-item d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <strong>{file.name}</strong>
                      <br />
                      <a
                        href={`http://localhost:4000${file.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver archivo
                      </a>
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleFileDelete(file.id)}
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No hay archivos subidos aún.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

AnexosTab.propTypes = {
  id: PropTypes.string.isRequired,
};

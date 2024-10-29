import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

export default function ValidacionesTab({ id }) {
  const [fields, setFields] = useState([]);
  const [data, setData] = useState({});
  const [tableName] = useState('pi_validaciones');
  const [loading, setLoading] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Función para obtener archivos en el frontend
  const fetchFiles = useCallback(async (caracterizacionId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const filesResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${caracterizacionId}/files`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            source: 'validaciones',
          },
        }
      );
      setUploadedFiles(filesResponse.data.files);
    } catch (error) {
      console.error('Error obteniendo los archivos:', error);
      setError('Error obteniendo los archivos');
    }
  }, [tableName]);

  useEffect(() => {
    const fetchFieldsAndData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const fieldsResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/fields`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setFields(fieldsResponse.data);

        const recordsResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/records?caracterizacion_id=${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (recordsResponse.data.length > 0) {
          const existingRecord = recordsResponse.data[0];
          setData(existingRecord);
          setRecordId(existingRecord.id);
          await fetchFiles(id); // Llamar a fetchFiles pasando el caracterizacionId
        } else {
          setUploadedFiles([]); // Si no hay registros, limpiar la lista de archivos
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

  const handleStatusChange = async (field, status) => {
    const updatedData = { ...data, [field]: status, caracterizacion_id: id };
    setData(updatedData);

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      if (recordId) {
        await axios.put(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/record/${recordId}`,
          updatedData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        alert('Validación actualizada exitosamente');
      } else {
        const createResponse = await axios.post(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/record`,
          updatedData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setRecordId(createResponse.data.id);
        await fetchFiles(id);
        alert('Validación creada exitosamente');
      }
    } catch (error) {
      console.error('Error guardando los datos:', error);
      setError('Error guardando los datos');
    }
  };

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
      formData.append('source', 'validaciones');

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

      await fetchFiles(id);
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
        await axios.delete(
          `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/record/${recordId}/file/${fileId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        await fetchFiles(id);
      } catch (error) {
        console.error('Error eliminando el archivo:', error);
        setError('Error eliminando el archivo');
      }
    }
  };

  return (
    <div>
      <h3>Validaciones</h3>
      {loading ? (
        <p>Cargando campos...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div>
          <div className="form-group">
            <label>Aprobación Asesor</label>
            <div>
              <button
                className={`btn ${data['Aprobación asesor'] ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => handleStatusChange('Aprobación asesor', true)}
              >
                Aprobar
              </button>
              <button
                className={`btn ${data['Aprobación asesor'] === false ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={() => handleStatusChange('Aprobación asesor', false)}
              >
                Rechazar
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Aprobación Propais</label>
            <div>
              <button
                className={`btn ${data['Aprobación propaís'] ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => handleStatusChange('Aprobación propaís', true)}
              >
                Aprobar
              </button>
              <button
                className={`btn ${data['Aprobación propaís'] === false ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={() => handleStatusChange('Aprobación propaís', false)}
              >
                Rechazar
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Aprobación Comité de Compras</label>
            <div>
              <button
                className={`btn ${data['Aprobación comité de compras'] ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => handleStatusChange('Aprobación comité de compras', true)}
              >
                Aprobar
              </button>
              <button
                className={`btn ${data['Aprobación comité de compras'] === false ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={() => handleStatusChange('Aprobación comité de compras', false)}
              >
                Rechazar
              </button>
            </div>
          </div>

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
                        href={`https://impulso-capital-back.onrender.com${file.url}`}
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

ValidacionesTab.propTypes = {
  id: PropTypes.string.isRequired,
};


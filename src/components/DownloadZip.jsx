import { useState, useEffect } from 'react';
import axios from 'axios';

export default function DownloadZip() {
  const [tables, setTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [recordIds, setRecordIds] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Obtener las tablas principales desde el backend
    const fetchTables = async () => {
      try {
        const token = localStorage.getItem('token');
        const responseInscriptions = await axios.get(
          'https://impulso-capital-back.onrender.com/api/inscriptions/tables?tableType=inscription&isPrimary=true',
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const responseProviders = await axios.get(
          'https://impulso-capital-back.onrender.com/api/inscriptions/tables?tableType=provider&isPrimary=true',
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setTables([...responseInscriptions.data, ...responseProviders.data]);
      } catch (error) {
        console.error(error);
        setError('Error obteniendo las tablas principales');
      }
    };
    fetchTables();
  }, []);

  const handleDownload = async () => {
    if (selectedTables.length === 0 || !recordIds) {
      setError('Por favor, selecciona al menos una tabla y proporciona los IDs');
      return;
    }

    try {
      setError('');
      setSuccessMessage('');

      const token = localStorage.getItem('token');

      // Convertir los IDs de registros en un array y limpiar espacios
      const recordIdsArray = recordIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id !== '');

      // Validar que los IDs sean números
      if (recordIdsArray.some((id) => isNaN(id))) {
        setError('Los IDs deben ser números separados por comas');
        return;
      }

      // Crear un objeto con las tablas y los IDs
      const requestData = {
        tables: selectedTables,
        recordIds: recordIdsArray,
      };

      // Hacer la solicitud para descargar el ZIP
      const response = await axios.post(
        `https://impulso-capital-back.onrender.com/api/inscriptions/download-multiple-zip`,
        requestData,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob', // Es importante para manejar el archivo binario
        }
      );

      // Crear un enlace para descargar el archivo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `archivos_seleccionados.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessMessage('Descarga completada');
    } catch (error) {
      console.error(error);
      setError('Error al descargar los archivos');
    }
  };

  return (
    <div className="content-wrapper">
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Descarga Masiva de Archivos</h1>
            </div>
          </div>
        </div>
      </section>

      <section className="content">
        <div className="container-fluid">
          <div className="card card-primary">
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}
              {successMessage && <div className="alert alert-success">{successMessage}</div>}

              <div className="form-group">
                <label>Selecciona una o más Tablas Principales</label>
                <select
                  multiple
                  className="form-control"
                  value={selectedTables}
                  onChange={(e) => {
                    const options = e.target.options;
                    const selected = [];
                    for (let i = 0; i < options.length; i++) {
                      if (options[i].selected) {
                        selected.push(options[i].value);
                      }
                    }
                    setSelectedTables(selected);
                  }}
                >
                  {tables.map((table) => (
                    <option key={table.table_name} value={table.table_name}>
                      {table.table_name}
                    </option>
                  ))}
                </select>
                <small className="form-text text-muted">
                  Mantén presionada la tecla Ctrl (Windows) o Cmd (Mac) para seleccionar múltiples tablas.
                </small>
              </div>

              <div className="form-group">
                <label>Introduce los IDs de los Registros (separados por comas)</label>
                <input
                  type="text"
                  className="form-control"
                  value={recordIds}
                  onChange={(e) => setRecordIds(e.target.value)}
                  placeholder="Ejemplo: 1, 2, 3"
                />
              </div>

              <button className="btn btn-primary" onClick={handleDownload}>
                Descargar Archivos en .ZIP
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}



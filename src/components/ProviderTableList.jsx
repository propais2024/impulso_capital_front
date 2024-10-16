import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './css/UsersList.css'; // Ajusta la ruta si es necesario

export default function ProviderTableList() {
  // Estados y variables
  const [tables, setTables] = useState([]); // Tablas disponibles
  const [selectedTable, setSelectedTable] = useState(''); // Tabla seleccionada
  const [isPrimaryTable, setIsPrimaryTable] = useState(false); // Si la tabla es principal
  const [records, setRecords] = useState([]); // Registros de la tabla
  const [columns, setColumns] = useState([]); // Columnas de la tabla
  const [fieldsData, setFieldsData] = useState([]); // Información completa de los campos
  const [visibleColumns, setVisibleColumns] = useState([]); // Columnas a mostrar
  const [loading, setLoading] = useState(false); // Estado de carga
  const [error, setError] = useState(null); // Estado de error
  const [search, setSearch] = useState(''); // Búsqueda
  const [showSearchBar, setShowSearchBar] = useState(false); // Mostrar barra de búsqueda

  const [selectedRecords, setSelectedRecords] = useState([]); // Registros seleccionados
  const [multiSelectFields, setMultiSelectFields] = useState([]); // Campos de clave foránea
  const [bulkUpdateData, setBulkUpdateData] = useState({}); // Datos para actualización masiva
  const [fieldOptions, setFieldOptions] = useState({}); // Opciones para campos de clave foránea

  const navigate = useNavigate();

  // Claves únicas para evitar conflictos entre módulos
  const LOCAL_STORAGE_TABLE_KEY = 'providerSelectedTable'; // Clave única para tablas en providers
  const LOCAL_STORAGE_COLUMNS_KEY = 'providerVisibleColumns'; // Clave única para columnas visibles
  const LOCAL_STORAGE_SEARCH_KEY = 'providerSearchQuery'; // Clave única para búsqueda

  // Función para obtener columnas y registros de la tabla seleccionada
  const fetchTableData = async (tableName, savedVisibleColumns = null) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      // Obtener campos con información completa
      const fieldsResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/fields`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            tableType: 'provider' // Especificamos que estamos trabajando con tablas de proveedores
          }
        }
      );

      const fetchedColumns = fieldsResponse.data.map((column) => column.column_name);
      setColumns(fetchedColumns);
      setFieldsData(fieldsResponse.data); // Guardar información completa de los campos

      // Identificar campos de selección múltiple (claves foráneas)
      const multiSelectFieldsArray = fieldsResponse.data
        .filter((column) => column.constraint_type === 'FOREIGN KEY')
        .map((column) => column.column_name);

      setMultiSelectFields(multiSelectFieldsArray);

      // Si hay columnas visibles guardadas en localStorage, úsalas; si no, muestra todas las columnas por defecto
      const localVisibleColumns =
        savedVisibleColumns || JSON.parse(localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY)) || [];
      if (localVisibleColumns.length > 0) {
        setVisibleColumns(localVisibleColumns);
      } else {
        setVisibleColumns(fetchedColumns); // Mostrar todas las columnas por defecto
      }

      // Obtener registros
      const recordsResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/records`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            tableType: 'provider' // Especificamos que estamos trabajando con tablas de proveedores
          }
        }
      );
      setRecords(recordsResponse.data); // Establecer registros

      setLoading(false);
    } catch (error) {
      setError('Error obteniendo los registros');
      setLoading(false);
    }
  };

  // Cargar las tablas y los filtros guardados desde el localStorage al montar
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('https://impulso-capital-back.onrender.com/api/inscriptions/tables', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            tableType: 'provider' // Especificamos que estamos trabajando con tablas de proveedores
          }
        });
        setTables(response.data || []); // Asegurar que `tables` es un array

        // Cargar la tabla seleccionada y las columnas visibles guardadas desde el localStorage
        const savedTable = localStorage.getItem(LOCAL_STORAGE_TABLE_KEY);
        const savedVisibleColumns = JSON.parse(localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY));

        if (savedTable) {
          setSelectedTable(savedTable);

          const selectedTableObj = response.data.find(
            (table) => table.table_name === savedTable
          );
          setIsPrimaryTable(selectedTableObj?.is_primary || false); // Actualizar estado

          fetchTableData(savedTable, savedVisibleColumns);
        }
      } catch (error) {
        setError('Error obteniendo las tablas');
      }
    };

    fetchTables();
  }, []);

  // Manejar Select2 con persistencia
  useEffect(() => {
    if (window.$) {
      // Inicializar select2
      window.$('.select2').select2({
        closeOnSelect: false, // No cerrar al seleccionar
        width: '100%',
      });

      // Manejar el cambio en select2 y actualizar el estado y localStorage
      window.$('.select2').on('change', (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions || []).map(
          (option) => option.value
        );
        setVisibleColumns(selectedOptions);
        localStorage.setItem(LOCAL_STORAGE_COLUMNS_KEY, JSON.stringify(selectedOptions));
      });

      // Cargar las columnas visibles guardadas desde el localStorage
      const savedVisibleColumns = JSON.parse(localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY));
      if (savedVisibleColumns && savedVisibleColumns.length > 0) {
        window.$('.select2').val(savedVisibleColumns).trigger('change');
      }
    }

    // Cargar la búsqueda persistente
    const savedSearch = localStorage.getItem(LOCAL_STORAGE_SEARCH_KEY);
    if (savedSearch) {
      setSearch(savedSearch);
    }
  }, [columns]);

  // Manejar la selección de tabla
  const handleTableSelect = (e) => {
    const tableName = e.target.value;
    setSelectedTable(tableName);
    localStorage.setItem(LOCAL_STORAGE_TABLE_KEY, tableName); // Guardar tabla seleccionada en el localStorage

    if (tableName) {
      const selectedTableObj = tables.find((table) => table.table_name === tableName);
      setIsPrimaryTable(selectedTableObj?.is_primary || false); // Actualizar estado

      const savedVisibleColumns = JSON.parse(localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY));
      fetchTableData(tableName, savedVisibleColumns); // Cargar columnas y registros de la tabla seleccionada
    } else {
      setRecords([]); // Limpiar los registros si no se selecciona ninguna tabla
      setIsPrimaryTable(false);
    }
  };

  // Función para obtener el valor a mostrar en una columna
  const getColumnDisplayValue = (record, column) => {
    if (multiSelectFields.includes(column)) {
      // Es un campo de clave foránea
      const fieldData = fieldsData.find((field) => field.column_name === column); // Uso de fieldsData
      const foreignKeyValue = record[column];

      if (fieldOptions[column]) {
        const option = fieldOptions[column].find(
          (opt) => opt.value === foreignKeyValue
        );
        if (option) {
          return option.label; // Mostrar el nombre asociado
        }
      }

      return foreignKeyValue; // Si no se encuentra el nombre, mostrar el ID
    } else {
      return record[column];
    }
  };

  // Aplicar el filtro de búsqueda
  const filteredRecords = search
    ? records.filter((record) => {
        return visibleColumns.some((column) => {
          const value = getColumnDisplayValue(record, column);
          return value?.toString()?.toLowerCase().includes(search.toLowerCase());
        });
      })
    : records;

  // Función para limpiar filtros y mostrar todos los registros
  const clearFilters = () => {
    setVisibleColumns(columns); // Mostrar todas las columnas disponibles
    setSearch(''); // Limpiar búsqueda
    localStorage.removeItem(LOCAL_STORAGE_COLUMNS_KEY); // Limpiar filtros persistentes
    localStorage.removeItem(LOCAL_STORAGE_SEARCH_KEY); // Limpiar búsqueda persistente

    // Volver a cargar todos los registros de la tabla seleccionada
    fetchTableData(selectedTable); // Restablecer la tabla completa sin filtros
  };

  // Manejar el cambio en la búsqueda
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    localStorage.setItem(LOCAL_STORAGE_SEARCH_KEY, e.target.value); // Guardar búsqueda en el localStorage
  };

  // Manejar cambios en los checkboxes
  const handleCheckboxChange = (recordId) => {
    setSelectedRecords((prevSelected) => {
      if (prevSelected.includes(recordId)) {
        return prevSelected.filter((id) => id !== recordId);
      } else {
        return [...prevSelected, recordId];
      }
    });
  };

  // Manejar selección de todos los registros
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allRecordIds = filteredRecords.map((record) => record.id);
      setSelectedRecords(allRecordIds);
    } else {
      setSelectedRecords([]);
    }
  };

  // Manejar cambios en los campos de actualización masiva
  const handleBulkUpdateChange = (field, value) => {
    setBulkUpdateData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  // Aplicar actualización masiva
  const applyBulkUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${selectedTable}/bulk-update`,
        {
          recordIds: selectedRecords,
          updates: bulkUpdateData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            tableType: 'provider' // Especificamos que estamos trabajando con tablas de proveedores
          }
        }
      );
      alert('Registros actualizados con éxito');
      // Recargar los registros después de la actualización
      fetchTableData(selectedTable);
      // Limpiar la selección
      setSelectedRecords([]);
      setBulkUpdateData({});
    } catch (error) {
      setError('Error actualizando los registros');
    }
  };

  // Obtener opciones para los campos de selección múltiple (claves foráneas)
  useEffect(() => {
    const fetchFieldOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const options = {};

        for (const field of multiSelectFields) {
          const response = await axios.get(
            `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${selectedTable}/field-options/${field}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              params: {
                tableType: 'provider' // Especificamos que estamos trabajando con tablas de proveedores
              }
            }
          );
          options[field] = response.data.options;
        }
        setFieldOptions(options);
      } catch (error) {
        setError('Error obteniendo las opciones de los campos');
      }
    };

    if (multiSelectFields.length > 0 && selectedTable) {
      fetchFieldOptions();
    } else {
      setFieldOptions({});
    }
  }, [multiSelectFields, selectedTable]);

  return (
    <div className="content-wrapper">
      {/* Cabecera */}
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Gestionar Tablas de Proveedores</h1>
            </div>
            <div className="col-sm-6 d-flex justify-content-end">
              <button
                className="btn btn-light mr-2"
                onClick={() => setShowSearchBar(!showSearchBar)}
              >
                {showSearchBar ? 'Ocultar búsqueda' : 'Mostrar búsqueda'}
              </button>
              <select
                id="tableSelect"
                className="form-control"
                value={selectedTable}
                onChange={handleTableSelect}
                style={{ maxWidth: '250px' }}
              >
                <option value="">-- Selecciona una tabla --</option>
                {tables.length > 0 &&
                  tables.map((table) => (
                    <option key={table.table_name} value={table.table_name}>
                      {table.table_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Contenido principal */}
      <section className="content">
        <div className="container-fluid">
          {/* Otros contenidos */}
          <div className="row">
            <div className="col-12">
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="card">
                <div className="card-body table-responsive p-0">
                  {/* Barra de búsqueda */}
                  {showSearchBar && (
                    <div className="row mb-3">
                      <div className="col-sm-6">
                        <div className="form-group">
                          <input
                            type="text"
                            className="form-control search-input"
                            placeholder="Buscar en columnas visibles..."
                            value={search}
                            onChange={handleSearchChange}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Select de columnas */}
                  {columns.length > 0 && (
                    <div className="form-group mb-3">
                      <label>Selecciona las columnas a mostrar:</label>
                      <select className="select2" multiple="multiple" style={{ width: '100%' }}>
                        {columns.map((column) => (
                          <option key={column} value={column}>
                            {column}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Tabla de registros */}
                  {loading ? (
                    <div className="d-flex justify-content-center p-3">Cargando...</div>
                  ) : (
                    <table className="table table-hover text-nowrap minimal-table">
                      <thead>
                        <tr>
                          {isPrimaryTable && (
                            <th>
                              <input
                                type="checkbox"
                                onChange={handleSelectAll}
                                checked={
                                  selectedRecords.length === filteredRecords.length &&
                                  filteredRecords.length > 0
                                }
                              />
                            </th>
                          )}
                          {visibleColumns.length > 0 &&
                            visibleColumns.map((column) => (
                              <th key={column}>{column}</th>
                            ))}
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.length > 0 &&
                          filteredRecords.map((record) => (
                            <tr key={record.id}>
                              {isPrimaryTable && (
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={selectedRecords.includes(record.id)}
                                    onChange={() => handleCheckboxChange(record.id)}
                                  />
                                </td>
                              )}
                              {visibleColumns.map((column) => (
                                <td key={column}>{getColumnDisplayValue(record, column)}</td>
                              ))}
                              <td>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() =>
                                    navigate(`/table/${selectedTable}/record/${record.id}`)
                                  }
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}

                  {/* Sección de actualización masiva */}
                  {isPrimaryTable && selectedRecords.length > 0 && (
                    <div className="bulk-update-section mt-3 p-3 bg-light">
                      <h4>Actualizar campos seleccionados</h4>
                      {multiSelectFields.map((field) => (
                        <div key={field} className="form-group">
                          <label>{field}</label>
                          <select
                            className="form-control"
                            value={bulkUpdateData[field] || ''}
                            onChange={(e) => handleBulkUpdateChange(field, e.target.value)}
                          >
                            <option value="">-- Selecciona una opción --</option>
                            {fieldOptions[field]?.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                      <button className="btn btn-primary" onClick={applyBulkUpdate}>
                        Aplicar cambios
                      </button>
                    </div>
                  )}

                  {/* Botón para limpiar filtros */}
                  <div className="mt-3">
                    <button className="btn btn-secondary" onClick={clearFilters}>
                      Limpiar filtros
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Fin de otros contenidos */}
        </div>
      </section>
    </div>
  );
}

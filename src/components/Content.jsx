export default function Content() {
  return (
    <div className="content-wrapper">
      {/* Content Header (Page header) */}
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Escritorio</h1>
            </div>
          </div>
        </div>
      </section>
      {/* Main content */}
      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              {/* Default box */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Estadísticas</h3>
                  <div className="card-tools">
                    <button type="button" className="btn btn-tool" data-card-widget="collapse" title="Collapse">
                      <i className="fas fa-minus" />
                    </button>
                    <button type="button" className="btn btn-tool" data-card-widget="remove" title="Remove">
                      <i className="fas fa-times" />
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {/* Iframe para Power BI */}
                  <iframe
                    title="IC 2024 VF"
                    width="600"
                    height="373.5"
                    src="https://app.powerbi.com/view?r=eyJrIjoiZDBhMDc0Y2QtNTI2Zi00MTAzLWJlYTgtYWQ0Y2Q4NDU3NmRkIiwidCI6IjgxNjQwZjgyLTVjNDAtNGI5Yi1hYWM2LWQzMjM4ODQ2NjcxMSIsImMiOjR9"
                    frameBorder="0"
                    allowFullScreen="true"
                  ></iframe>
                </div>
                {/* /.card-body */}
              </div>
              {/* /.card */}
            </div>
          </div>
        </div>
      </section>
      {/* /.content */}
    </div>
  );
}


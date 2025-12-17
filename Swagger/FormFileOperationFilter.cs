using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Http;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace ExcelProcessorApi.Swagger
{
    public class FormFileOperationFilter : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            var fileParameters = context.ApiDescription.ParameterDescriptions
                .Where(p => p.ModelMetadata?.ModelType == typeof(IFormFile)
                    || (p.ModelMetadata?.ModelType != null
                        && typeof(IEnumerable<IFormFile>).IsAssignableFrom(p.ModelMetadata.ModelType)))
                .ToList();

            if (fileParameters.Count == 0)
            {
                return;
            }

            operation.Parameters = operation.Parameters
                .Where(p => fileParameters.All(fp => !string.Equals(fp.Name, p.Name, System.StringComparison.Ordinal)))
                .ToList();

            operation.RequestBody ??= new OpenApiRequestBody();

            var schema = new OpenApiSchema
            {
                Type = "object",
                Properties = new Dictionary<string, OpenApiSchema>(),
                Required = new HashSet<string>()
            };

            foreach (var parameter in fileParameters)
            {
                schema.Properties[parameter.Name] = new OpenApiSchema
                {
                    Type = "string",
                    Format = "binary"
                };
            }

            var required = fileParameters
                .Where(p => p.IsRequired)
                .Select(p => p.Name)
                .ToList();

            if (required.Count > 0)
            {
                foreach (var propertyName in required)
                {
                    schema.Required.Add(propertyName);
                }
            }

            operation.RequestBody.Content["multipart/form-data"] = new OpenApiMediaType
            {
                Schema = schema
            };
        }
    }
}

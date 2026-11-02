# Imagen del backend. Sirve igual en una PC (amd64) que en la Raspberry Pi (arm64).

# 1) Compilar con Maven
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

# 2) Imagen final, solo con el JRE y el .jar
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 flexpass
COPY --from=build /app/target/backend-*.jar app.jar
USER flexpass
EXPOSE 8080
ENV TZ=America/Guatemala
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-Duser.timezone=America/Guatemala", "-jar", "app.jar"]

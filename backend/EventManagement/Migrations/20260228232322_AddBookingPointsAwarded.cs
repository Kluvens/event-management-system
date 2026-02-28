using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventManagement.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingPointsAwarded : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ArePointsAwarded",
                table: "Bookings",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            // Treat all pre-existing bookings as already awarded — they were credited
            // immediately under the old logic, so we must not double-credit them.
            migrationBuilder.Sql("UPDATE \"Bookings\" SET \"ArePointsAwarded\" = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ArePointsAwarded",
                table: "Bookings");
        }
    }
}

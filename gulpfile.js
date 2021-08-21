/**
 * Created by jstenner on 7/3/16.
 */

var gulp = require('gulp');
var bower = require('gulp-bower');

var config = {
    /*bowerDir: './bower_components'*/
    bowerDir: './static/lib'
}

gulp.task('icons', function() {
    return gulp.src(config.bowerDir + '/font-awesome/fonts/**.*')
        .pipe(gulp.dest('./static/fonts'));
});

gulp.task('fa', function() {
    return gulp.src(config.bowerDir + '/font-awesome/css/**.*')
        .pipe(gulp.dest('./static/css'));
});

gulp.task('bowser', function() {
    return gulp.src(config.bowerDir + '/bowser/src/**.*')
        .pipe(gulp.dest('./static/js'));
});

gulp.task('tween', function() {
    return gulp.src(config.bowerDir + '/tween.js/src/**.*')
        .pipe(gulp.dest('./static/js'));
});

gulp.task('jquery', function() {
    return gulp.src(config.bowerDir + '/jquery/dist/**.*')
        .pipe(gulp.dest('./static/js'));
});

gulp.task('bootstrapjs', function() {
    return gulp.src(config.bowerDir + '/bootstrap/dist/js/**.*')
        .pipe(gulp.dest('./static/js'));
});

gulp.task('bootstrapcss', function() {
    return gulp.src(config.bowerDir + '/bootstrap/dist/css/**.*')
        .pipe(gulp.dest('./static/css'));
});

gulp.task('bootstrapfonts', function() {
    return gulp.src(config.bowerDir + '/bootstrap/dist/fonts/**.*')
        .pipe(gulp.dest('./static/fonts'));
});

// Default Task
gulp.task('default', ['icons', 'fa', 'bowser', 'tween', 'jquery', 'bootstrapjs', 'bootstrapcss', 'bootstrapfonts']);